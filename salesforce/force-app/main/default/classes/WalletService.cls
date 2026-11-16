/**
 * Sign-in and wallet summaries.
 *
 * verifySignIn is called after Next.js has checked the magic-link token's signature and expiry.
 * Tokens are single use: Last_Token_Issued_At__c stores the issue time of the last token used, and
 * any token issued at or before it is rejected.
 */
public inherited sharing class WalletService {
  @TestVisible
  private static final Pattern EMAIL_PATTERN = Pattern.compile('^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$');
  @TestVisible
  private static final Integer RECENT_ENTRIES = 20;

  public static ShopDtos.VerifyResult verifySignIn(
    String email,
    Long issuedAt,
    String referralCode
  ) {
    Savepoint sp = Database.setSavepoint();
    try {
      String normalised = normaliseEmail(email);
      if (issuedAt == null || issuedAt <= 0) {
        throw new ShopException(ShopException.VALIDATION, 'issuedAt is required.');
      }

      Boolean isNew = false;
      Wallet__c wallet = findForUpdate(normalised);
      if (wallet == null) {
        wallet = insertWallet(normalised, issuedAt);
        // false when a concurrent request created the wallet first (existing-wallet path)
        isNew = insertedHere;
      }

      if (!isNew) {
        if (wallet.Last_Token_Issued_At__c != null && wallet.Last_Token_Issued_At__c >= issuedAt) {
          throw new ShopException(
            ShopException.UNAUTHORIZED,
            'This sign-in link has already been used. Request a new one.'
          );
        }
        wallet.Last_Token_Issued_At__c = issuedAt;
        update wallet;
      } else {
        EarnService.awardSystemTask(wallet.Id, 'signup', null);
        applyReferral(wallet, referralCode);
      }

      ShopDtos.VerifyResult result = new ShopDtos.VerifyResult();
      result.wallet = getWallet(wallet.Id);
      result.isNew = isNew;
      return result;
    } catch (Exception e) {
      Database.rollback(sp);
      throw e;
    }
  }

  public static ShopDtos.WalletDto getWallet(Id walletId) {
    List<Wallet__c> wallets = [
      SELECT Id, Email__c, Balance__c, Referral_Code__c
      FROM Wallet__c
      WHERE Id = :walletId
    ];
    if (wallets.isEmpty()) {
      throw new ShopException(ShopException.NOT_FOUND, 'Wallet not found.');
    }
    Wallet__c wallet = wallets[0];

    ShopDtos.WalletDto dto = new ShopDtos.WalletDto();
    dto.id = wallet.Id;
    dto.email = wallet.Email__c;
    dto.balance = ShopDtos.toInt(wallet.Balance__c);
    dto.referralCode = wallet.Referral_Code__c;
    for (Points_Ledger__c entry : [
      SELECT Id, Amount__c, Entry_Type__c, Reason__c, CreatedDate
      FROM Points_Ledger__c
      WHERE Wallet__c = :walletId
      ORDER BY CreatedDate DESC, Name DESC
      LIMIT :RECENT_ENTRIES
    ]) {
      dto.recentEntries.add(ShopDtos.toDto(entry));
    }
    for (AggregateResult row : [
      SELECT Earn_Task__r.Key__c taskKey, COUNT(Id) total
      FROM Task_Completion__c
      WHERE Wallet__c = :walletId
      GROUP BY Earn_Task__r.Key__c
    ]) {
      dto.taskCounts.put((String) row.get('taskKey'), (Integer) row.get('total'));
    }
    return dto;
  }

  // ------------------------------------------------------------------ helpers

  /** Set by insertWallet when this transaction created the wallet. */
  @TestVisible
  private static Boolean insertedHere = false;

  private static String normaliseEmail(String email) {
    String value = email == null ? '' : email.trim().toLowerCase();
    if (value.length() > 254 || !EMAIL_PATTERN.matcher(value).matches()) {
      throw new ShopException(ShopException.VALIDATION, 'Enter a valid email address.');
    }
    return value;
  }

  private static Wallet__c findForUpdate(String email) {
    List<Wallet__c> wallets = [
      SELECT Id, Email__c, Last_Token_Issued_At__c, First_Sign_In_At__c, Referred_By__c
      FROM Wallet__c
      WHERE Email__c = :email
      LIMIT 1
      FOR UPDATE
    ];
    return wallets.isEmpty() ? null : wallets[0];
  }

  /**
   * Inserts a new wallet. Salesforce's DUPLICATE_VALUE error does not name the clashing field, so on
   * a duplicate the email is looked up again: if a wallet now exists, another request created it at
   * the same moment and that wallet is returned; otherwise it was a referral-code clash, retried once
   * with a new code.
   */
  @TestVisible
  private static Wallet__c insertWallet(String email, Long issuedAt) {
    insertedHere = false;
    Wallet__c wallet = new Wallet__c(
      Email__c = email,
      Last_Token_Issued_At__c = issuedAt,
      First_Sign_In_At__c = System.now(),
      Referral_Code__c = firstReferralCodeForTest
    );
    for (Integer attempt = 0; attempt < 2; attempt++) {
      try {
        insert wallet;
        insertedHere = true;
        return wallet;
      } catch (DmlException e) {
        if (e.getDmlType(0) != StatusCode.DUPLICATE_VALUE) {
          throw e;
        }
        Wallet__c existing = findForUpdate(email);
        if (existing != null) {
          return existing;
        }
        if (attempt == 0) {
          wallet.Id = null;
          wallet.Referral_Code__c = null; // the trigger generates a new one
          continue;
        }
        throw e;
      }
    }
    throw new ShopException(ShopException.INTERNAL, 'Could not create the wallet.');
  }

  /** Test hook: forces the first insert attempt to use this referral code (to simulate a clash). */
  @TestVisible
  private static String firstReferralCodeForTest;

  private static void applyReferral(Wallet__c wallet, String referralCode) {
    if (String.isBlank(referralCode)) {
      return;
    }
    String code = referralCode.trim().toUpperCase();
    List<Wallet__c> referrers = [
      SELECT Id
      FROM Wallet__c
      WHERE Referral_Code__c = :code AND Id != :wallet.Id
      LIMIT 1
    ];
    if (referrers.isEmpty()) {
      return; // unknown codes are ignored
    }
    wallet.Referred_By__c = referrers[0].Id;
    update wallet;
    try {
      EarnService.awardSystemTask(referrers[0].Id, 'referral', String.valueOf(wallet.Id));
    } catch (ShopException e) {
      if (e.code != ShopException.TASK_LIMIT_REACHED) {
        throw e;
      }
      // The referrer has used all their referral rewards; the new visitor still signs in.
    }
  }
}
