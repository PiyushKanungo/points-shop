/**
 * The only writer of Points_Ledger__c.
 *
 * - Locks each affected wallet (SELECT ... FOR UPDATE) so balance checks and inserts for one wallet
 *   run one after another.
 * - Idempotent: a posting whose idempotency key already exists returns the existing entry.
 * - "Never negative" is enforced by the Balance_Not_Negative validation rule on Wallet__c, which
 *   fires when the roll-up recalculates; its message prefix is turned into INSUFFICIENT_POINTS.
 */
public inherited sharing class LedgerService {
  public static final String EARN = 'Earn';
  public static final String REDEEM = 'Redeem';
  public static final String REFUND = 'Refund';
  public static final String ADJUSTMENT = 'Adjustment';

  @TestVisible
  private static final String INSUFFICIENT_PREFIX = 'INSUFFICIENT_POINTS:';

  /** True only while postAll is inserting; PointsLedgerTriggerHandler rejects any other insert. */
  public static Boolean isPosting { get; private set; }
  static {
    isPosting = false;
  }

  public class Posting {
    public Id walletId;
    public Integer amount;
    public String entryType;
    public String reason;
    public String idempotencyKey;
    public Id taskCompletionId;
    public Id shopOrderId;

    public Posting(
      Id walletId,
      Integer amount,
      String entryType,
      String reason,
      String idempotencyKey,
      Id taskCompletionId,
      Id shopOrderId
    ) {
      this.walletId = walletId;
      this.amount = amount;
      this.entryType = entryType;
      this.reason = reason;
      this.idempotencyKey = idempotencyKey;
      this.taskCompletionId = taskCompletionId;
      this.shopOrderId = shopOrderId;
    }
  }

  public static Points_Ledger__c post(Posting posting) {
    return postAll(new List<Posting>{ posting })[0];
  }

  /** Posts entries and returns them (existing or new) in input order. */
  public static List<Points_Ledger__c> postAll(List<Posting> postings) {
    if (postings == null || postings.isEmpty()) {
      return new List<Points_Ledger__c>();
    }
    Set<Id> walletIds = new Set<Id>();
    Set<String> keys = new Set<String>();
    for (Posting p : postings) {
      validate(p);
      walletIds.add(p.walletId);
      keys.add(p.idempotencyKey);
    }
    lockWallets(walletIds);

    Map<String, Points_Ledger__c> byKey = findByKeys(keys);
    List<Points_Ledger__c> toInsert = buildMissing(postings, byKey);
    if (!toInsert.isEmpty()) {
      try {
        insertEntries(toInsert);
      } catch (DmlException e) {
        if (!isDuplicate(e)) {
          throw e;
        }
        // Another transaction inserted one of these keys after our lookup. Use its entries
        // and insert only what is still missing.
        byKey = findByKeys(keys);
        toInsert = buildMissing(postings, byKey);
        if (!toInsert.isEmpty()) {
          insertEntries(toInsert);
        }
      }
      for (Points_Ledger__c entry : toInsert) {
        byKey.put(entry.Idempotency_Key__c, entry);
      }
    }

    List<Points_Ledger__c> results = new List<Points_Ledger__c>();
    for (Posting p : postings) {
      results.add(byKey.get(p.idempotencyKey));
    }
    return results;
  }

  /** Locks the given wallets for the rest of the transaction. */
  public static void lockWallets(Set<Id> walletIds) {
    if (walletIds == null || walletIds.isEmpty()) {
      return;
    }
    List<Wallet__c> locked = [SELECT Id FROM Wallet__c WHERE Id IN :walletIds FOR UPDATE];
    if (locked.size() != walletIds.size()) {
      throw new ShopException(ShopException.NOT_FOUND, 'Wallet not found.');
    }
  }

  /** Current balance of a wallet (0 when it has no entries). */
  public static Integer balanceOf(Id walletId) {
    List<Wallet__c> wallets = [SELECT Balance__c FROM Wallet__c WHERE Id = :walletId];
    if (wallets.isEmpty()) {
      throw new ShopException(ShopException.NOT_FOUND, 'Wallet not found.');
    }
    return wallets[0].Balance__c == null ? 0 : wallets[0].Balance__c.intValue();
  }

  private static void validate(Posting p) {
    if (
      p == null ||
      p.walletId == null ||
      p.amount == null ||
      p.amount == 0 ||
      String.isBlank(p.entryType) ||
      String.isBlank(p.idempotencyKey)
    ) {
      throw new ShopException(
        ShopException.VALIDATION,
        'A ledger posting needs a wallet, a non-zero amount, a type and an idempotency key.'
      );
    }
  }

  private static Map<String, Points_Ledger__c> findByKeys(Set<String> keys) {
    Map<String, Points_Ledger__c> byKey = new Map<String, Points_Ledger__c>();
    for (Points_Ledger__c entry : [
      SELECT
        Id,
        Name,
        Wallet__c,
        Amount__c,
        Entry_Type__c,
        Reason__c,
        Idempotency_Key__c,
        Task_Completion__c,
        Shop_Order__c,
        CreatedDate
      FROM Points_Ledger__c
      WHERE Idempotency_Key__c IN :keys
    ]) {
      byKey.put(entry.Idempotency_Key__c, entry);
    }
    return byKey;
  }

  private static List<Points_Ledger__c> buildMissing(
    List<Posting> postings,
    Map<String, Points_Ledger__c> existing
  ) {
    List<Points_Ledger__c> missing = new List<Points_Ledger__c>();
    Set<String> seen = new Set<String>();
    for (Posting p : postings) {
      if (existing.containsKey(p.idempotencyKey) || seen.contains(p.idempotencyKey)) {
        continue;
      }
      seen.add(p.idempotencyKey);
      missing.add(
        new Points_Ledger__c(
          Wallet__c = p.walletId,
          Amount__c = p.amount,
          Entry_Type__c = p.entryType,
          Reason__c = p.reason == null ? null : p.reason.left(255),
          Idempotency_Key__c = p.idempotencyKey,
          Task_Completion__c = p.taskCompletionId,
          Shop_Order__c = p.shopOrderId
        )
      );
    }
    return missing;
  }

  private static void insertEntries(List<Points_Ledger__c> entries) {
    isPosting = true;
    try {
      insert entries;
    } catch (DmlException e) {
      for (Integer i = 0; i < e.getNumDml(); i++) {
        String message = e.getDmlMessage(i);
        if (message != null && message.contains(INSUFFICIENT_PREFIX)) {
          throw new ShopException(ShopException.INSUFFICIENT_POINTS, 'Not enough points.');
        }
      }
      throw e;
    } finally {
      isPosting = false;
    }
  }

  private static Boolean isDuplicate(DmlException e) {
    for (Integer i = 0; i < e.getNumDml(); i++) {
      if (e.getDmlType(i) == StatusCode.DUPLICATE_VALUE) {
        return true;
      }
    }
    return false;
  }
}
