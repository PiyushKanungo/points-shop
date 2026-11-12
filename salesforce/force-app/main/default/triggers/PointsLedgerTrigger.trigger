trigger PointsLedgerTrigger on Points_Ledger__c(
  before insert,
  before update,
  before delete,
  after insert,
  after update,
  after delete,
  after undelete
) {
  new PointsLedgerTriggerHandler().run();
}
