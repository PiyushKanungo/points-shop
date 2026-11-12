/**
 * Awards task points.
 *
 * completeTask: called through the API for Form and Honour tasks only.
 * awardSystemTask: internal, for signup, referral and review.
 *
 * Completion key: walletId:taskKey, or walletId:taskKey:ref when a ref is given (order ID for a
 * review, new wallet ID for a referral). Ledger key: earn:<completion key>.
 */
public inherited sharing class EarnService {
  @TestVisible
  private static final Set<String> API_VERIFICATIONS = new Set<String>{ 'Form', 'Honour' };
  @TestVisible
  private static final Integer MAX_EVIDENCE = 2000;

  public static ShopDtos.TaskResult completeTask(Id walletId, String taskKey, String evidence) {
    Savepoint sp = Database.setSavepoint();
    try {
      Earn_Task__c task = loadTask(taskKey);
      if (!API_VERIFICATIONS.contains(task.Verification__c)) {
        throw new ShopException(
          ShopException.VALIDATION,
          'This task cannot be completed directly.'
        );
      }
      if (evidence != null && evidence.length() > MAX_EVIDENCE) {
        throw new ShopException(
          ShopException.VALIDATION,
          'Evidence must be 2,000 characters or fewer.'
        );
      }
      return award(walletId, task, null, String.isBlank(evidence) ? null : evidence);
    } catch (Exception e) {
      Database.rollback(sp);
      throw e;
    }
  }

  /** Returns the points awarded (0 on a replay). */
  public static Integer awardSystemTask(Id walletId, String taskKey, String ref) {
    Savepoint sp = Database.setSavepoint();
    try {
      return award(walletId, loadTask(taskKey), ref, null).pointsAwarded;
    } catch (Exception e) {
      Database.rollback(sp);
      throw e;
    }
  }

  public static String completionKey(Id walletId, String taskKey, String ref) {
    String key = String.valueOf(walletId) + ':' + taskKey;
    return String.isBlank(ref) ? key : key + ':' + ref;
  }

  private static ShopDtos.TaskResult award(
    Id walletId,
    Earn_Task__c task,
    String ref,
    String evidence
  ) {
    LedgerService.lockWallets(new Set<Id>{ walletId });
    String key = completionKey(walletId, task.Key__c, ref);

    ShopDtos.TaskResult result = new ShopDtos.TaskResult();
    List<Task_Completion__c> existing = [
      SELECT Id
      FROM Task_Completion__c
      WHERE Completion_Key__c = :key
    ];
    if (!existing.isEmpty()) {
      result.pointsAwarded = 0;
      result.replay = true;
      result.balance = LedgerService.balanceOf(walletId);
      return result;
    }

    Integer done = [
      SELECT COUNT()
      FROM Task_Completion__c
      WHERE Wallet__c = :walletId AND Earn_Task__c = :task.Id
    ];
    if (done >= ShopDtos.toInt(task.Max_Per_Wallet__c)) {
      throw new ShopException(
        ShopException.TASK_LIMIT_REACHED,
        'You have already earned the most points this task allows.'
      );
    }

    Integer points = ShopDtos.toInt(task.Points__c);
    Task_Completion__c completion = new Task_Completion__c(
      Wallet__c = walletId,
      Earn_Task__c = task.Id,
      Completion_Key__c = key,
      Evidence__c = evidence,
      Points_Awarded__c = points
    );
    insert completion;

    LedgerService.post(
      new LedgerService.Posting(
        walletId,
        points,
        LedgerService.EARN,
        'Task: ' + task.Name,
        'earn:' + key,
        completion.Id,
        null
      )
    );

    result.pointsAwarded = points;
    result.replay = false;
    result.balance = LedgerService.balanceOf(walletId);
    return result;
  }

  private static Earn_Task__c loadTask(String taskKey) {
    List<Earn_Task__c> tasks = [
      SELECT Id, Name, Key__c, Points__c, Verification__c, Max_Per_Wallet__c
      FROM Earn_Task__c
      WHERE Key__c = :taskKey AND Active__c = TRUE
      LIMIT 1
    ];
    if (tasks.isEmpty()) {
      throw new ShopException(ShopException.NOT_FOUND, 'Task not found.');
    }
    return tasks[0];
  }
}
