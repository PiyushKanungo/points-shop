@IsTest
private class TaskCompletionTriggerHandlerTest {
  @TestSetup
  static void setup() {
    TestDataFactory.createCatalog();
  }

  private static Task_Completion__c completion() {
    Wallet__c wallet = TestDataFactory.createWallet('history@example.com', 0);
    EarnService.completeTask(wallet.Id, 'explore', null);
    return [SELECT Id, Evidence__c FROM Task_Completion__c LIMIT 1];
  }

  @IsTest
  static void completionsCannotBeChangedOrDeleted() {
    Task_Completion__c c = completion();
    c.Evidence__c = 'rewritten';
    try {
      update c;
      Assert.fail('Expected update to fail');
    } catch (DmlException e) {
      Assert.isTrue(e.getMessage().contains(TaskCompletionTriggerHandler.CHANGE_ERROR));
    }
    try {
      delete c;
      Assert.fail('Expected delete to fail');
    } catch (DmlException e) {
      Assert.isTrue(e.getMessage().contains(TaskCompletionTriggerHandler.CHANGE_ERROR));
    }
  }

  @IsTest
  static void bypassAllowsTheDeleteWalletScript() {
    Task_Completion__c c = completion();
    TriggerHandler.bypass('TaskCompletionTriggerHandler');
    delete c;
    TriggerHandler.clearBypass('TaskCompletionTriggerHandler');
    Assert.areEqual(0, [SELECT COUNT() FROM Task_Completion__c]);
  }
}
