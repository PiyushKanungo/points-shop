@IsTest
private class EarnServiceTest {
  @TestSetup
  static void setup() {
    TestDataFactory.createCatalog();
  }

  private static Wallet__c wallet() {
    return TestDataFactory.createWallet('earner@example.com', 0);
  }

  private static String codeOfComplete(Id walletId, String taskKey, String evidence) {
    try {
      EarnService.completeTask(walletId, taskKey, evidence);
    } catch (ShopException e) {
      return e.code;
    }
    return null;
  }

  @IsTest
  static void honourTaskAwardsPointsOnce() {
    Wallet__c w = wallet();
    ShopDtos.TaskResult first = EarnService.completeTask(w.Id, 'explore', null);
    Assert.areEqual(30, first.pointsAwarded);
    Assert.isFalse(first.replay);
    Assert.areEqual(30, first.balance);

    ShopDtos.TaskResult second = EarnService.completeTask(w.Id, 'explore', null);
    Assert.areEqual(0, second.pointsAwarded);
    Assert.isTrue(second.replay);
    Assert.areEqual(30, TestDataFactory.balance(w.Id));
  }

  @IsTest
  static void formTaskKeepsEvidence() {
    Wallet__c w = wallet();
    EarnService.completeTask(w.Id, 'feedback', 'The cart page is clear.');
    Task_Completion__c completion = [SELECT Evidence__c, Points_Awarded__c FROM Task_Completion__c];
    Assert.areEqual('The cart page is clear.', completion.Evidence__c);
    Assert.areEqual(50, completion.Points_Awarded__c);
    Points_Ledger__c entry = [
      SELECT Idempotency_Key__c, Task_Completion__c, Reason__c
      FROM Points_Ledger__c
    ];
    Assert.areEqual('earn:' + w.Id + ':feedback', entry.Idempotency_Key__c);
    Assert.areEqual('Task: Give feedback on the site', entry.Reason__c);
  }

  @IsTest
  static void systemTasksCannotBeCompletedThroughTheEndpoint() {
    Wallet__c w = wallet();
    for (String key : new List<String>{ 'signup', 'referral', 'review' }) {
      Assert.areEqual(ShopException.VALIDATION, codeOfComplete(w.Id, key, null), key);
    }
    Assert.areEqual(0, TestDataFactory.balance(w.Id));
  }

  @IsTest
  static void inactiveOrUnknownTaskIsNotFound() {
    Wallet__c w = wallet();
    Earn_Task__c explore = [SELECT Id FROM Earn_Task__c WHERE Key__c = 'explore'];
    explore.Active__c = false;
    update explore;
    Assert.areEqual(ShopException.NOT_FOUND, codeOfComplete(w.Id, 'explore', null));
    Assert.areEqual(ShopException.NOT_FOUND, codeOfComplete(w.Id, 'no-such-task', null));
  }

  @IsTest
  static void longEvidenceIsRejected() {
    Wallet__c w = wallet();
    Assert.areEqual(ShopException.VALIDATION, codeOfComplete(w.Id, 'feedback', 'x'.repeat(2001)));
    Assert.areEqual(0, [SELECT COUNT() FROM Task_Completion__c]);
  }

  @IsTest
  static void systemAwardWithRefCountsEachRefOnceUpToTheLimit() {
    Wallet__c w = wallet();
    Test.startTest();
    Assert.areEqual(75, EarnService.awardSystemTask(w.Id, 'review', 'order-1'));
    Assert.areEqual(0, EarnService.awardSystemTask(w.Id, 'review', 'order-1'), 'replay');
    for (Integer i = 2; i <= 10; i++) {
      EarnService.awardSystemTask(w.Id, 'review', 'order-' + i);
    }
    Assert.areEqual(750, TestDataFactory.balance(w.Id));
    try {
      EarnService.awardSystemTask(w.Id, 'review', 'order-11');
      Assert.fail('Expected TASK_LIMIT_REACHED');
    } catch (ShopException e) {
      Assert.areEqual(ShopException.TASK_LIMIT_REACHED, e.code);
    }
    Test.stopTest();
    Assert.areEqual(10, [SELECT COUNT() FROM Task_Completion__c]);
    Assert.areEqual(750, TestDataFactory.balance(w.Id));
  }

  @IsTest
  static void unknownWalletIsNotFound() {
    Wallet__c w = wallet();
    Id walletId = w.Id;
    delete w;
    Assert.areEqual(ShopException.NOT_FOUND, codeOfComplete(walletId, 'explore', null));
  }
}
