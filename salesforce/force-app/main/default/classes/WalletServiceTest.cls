@IsTest
private class WalletServiceTest {
  private static final Long T1 = 1762900000000L;
  private static final Long T2 = 1762900060000L;
  private static final Long T3 = 1762900120000L;

  @TestSetup
  static void setup() {
    TestDataFactory.createCatalog();
  }

  private static String expectCode(String email, Long issuedAt, String referralCode) {
    try {
      WalletService.verifySignIn(email, issuedAt, referralCode);
    } catch (ShopException e) {
      return e.code;
    }
    return null;
  }

  @IsTest
  static void newEmailCreatesWalletWithSignupBonus() {
    ShopDtos.VerifyResult result = WalletService.verifySignIn('New@Example.com', T1, null);
    Assert.isTrue(result.isNew);
    Assert.areEqual('new@example.com', result.wallet.email);
    Assert.areEqual(50, result.wallet.balance);
    Assert.areEqual(1, result.wallet.taskCounts.get('signup'));
    Assert.areEqual(1, result.wallet.recentEntries.size());
    Wallet__c saved = [SELECT First_Sign_In_At__c, Last_Token_Issued_At__c FROM Wallet__c];
    Assert.isNotNull(saved.First_Sign_In_At__c);
    Assert.areEqual(T1, saved.Last_Token_Issued_At__c.longValue());
  }

  @IsTest
  static void tokensAreSingleUse() {
    WalletService.verifySignIn('reuse@example.com', T2, null);
    Assert.areEqual(
      ShopException.UNAUTHORIZED,
      expectCode('reuse@example.com', T2, null),
      'same token'
    );
    Assert.areEqual(
      ShopException.UNAUTHORIZED,
      expectCode('reuse@example.com', T1, null),
      'older token'
    );

    ShopDtos.VerifyResult again = WalletService.verifySignIn('reuse@example.com', T3, null);
    Assert.isFalse(again.isNew);
    Assert.areEqual(50, again.wallet.balance, 'No second signup bonus');
  }

  @IsTest
  static void existingWalletPathHandlesAConcurrentFirstSignIn() {
    // Another request created the wallet just before this one (no token recorded yet).
    insert new Wallet__c(Email__c = 'race@example.com');
    ShopDtos.VerifyResult result = WalletService.verifySignIn('race@example.com', T1, null);
    Assert.isFalse(result.isNew);
    Assert.areEqual(1, [SELECT COUNT() FROM Wallet__c WHERE Email__c = 'race@example.com']);
  }

  @IsTest
  static void referralRewardsTheReferrerOnce() {
    ShopDtos.VerifyResult referrer = WalletService.verifySignIn('referrer@example.com', T1, null);
    String code = referrer.wallet.referralCode;

    ShopDtos.VerifyResult friend = WalletService.verifySignIn(
      'friend@example.com',
      T1,
      code.toLowerCase()
    );
    Assert.isTrue(friend.isNew);
    Assert.areEqual(50, friend.wallet.balance);
    Assert.areEqual(150, WalletService.getWallet(referrer.wallet.id).balance);
    Assert.areEqual(
      referrer.wallet.id,
      [SELECT Referred_By__c FROM Wallet__c WHERE Email__c = 'friend@example.com'].Referred_By__c
    );

    // A code sent with a later sign-in of an existing wallet is ignored.
    WalletService.verifySignIn('friend@example.com', T2, code);
    Assert.areEqual(150, WalletService.getWallet(referrer.wallet.id).balance);
  }

  @IsTest
  static void unknownReferralCodeIsIgnored() {
    ShopDtos.VerifyResult result = WalletService.verifySignIn('solo@example.com', T1, 'NOPE2345');
    Assert.areEqual(50, result.wallet.balance);
  }

  @IsTest
  static void referralRewardsStopAtTheCap() {
    ShopDtos.VerifyResult referrer = WalletService.verifySignIn('popular@example.com', T1, null);
    String code = referrer.wallet.referralCode;
    // Five earlier referrals use up the cap.
    for (Integer i = 0; i < 5; i++) {
      EarnService.awardSystemTask(referrer.wallet.id, 'referral', 'earlier-friend-' + i);
    }
    Test.startTest();
    ShopDtos.VerifyResult sixth = WalletService.verifySignIn('sixth@example.com', T1, code);
    Test.stopTest();
    Assert.isTrue(sixth.isNew, 'The sixth friend still signs in');
    Assert.areEqual(50, sixth.wallet.balance);
    Assert.areEqual(50 + 5 * 100, WalletService.getWallet(referrer.wallet.id).balance);
  }

  @IsTest
  static void badInputIsRejected() {
    Assert.areEqual(ShopException.VALIDATION, expectCode('not-an-email', T1, null));
    Assert.areEqual(ShopException.VALIDATION, expectCode(null, T1, null));
    Assert.areEqual(ShopException.VALIDATION, expectCode('ok@example.com', null, null));
    Assert.areEqual(0, [SELECT COUNT() FROM Wallet__c]);
  }

  @IsTest
  static void unknownWalletIsNotFound() {
    Wallet__c wallet = new Wallet__c(Email__c = 'temp@example.com');
    insert wallet;
    Id walletId = wallet.Id;
    delete wallet;
    try {
      WalletService.getWallet(walletId);
      Assert.fail('Expected NOT_FOUND');
    } catch (ShopException e) {
      Assert.areEqual(ShopException.NOT_FOUND, e.code);
    }
  }
}
