trigger TaskCompletionTrigger on Task_Completion__c(
  before insert,
  before update,
  before delete,
  after insert,
  after update,
  after delete,
  after undelete
) {
  new TaskCompletionTriggerHandler().run();
}
