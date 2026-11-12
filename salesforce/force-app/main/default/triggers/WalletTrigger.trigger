trigger WalletTrigger on Wallet__c(
  before insert,
  before update,
  before delete,
  after insert,
  after update,
  after delete,
  after undelete
) {
  new WalletTriggerHandler().run();
}
