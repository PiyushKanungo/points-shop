// Deletes one visitor's data for a privacy request: task completions, orders, then the wallet
// (which cascades to its ledger entries). Resume files in Vercel Blob are deleted by hand.
//
// Run: sf apex run --file scripts/apex/delete-wallet.apex
// Set the email below first.
String email = 'visitor@example.com';

List<Wallet__c> wallets = [SELECT Id FROM Wallet__c WHERE Email__c = :email.trim().toLowerCase()];
if (wallets.isEmpty()) {
  System.debug('No wallet for ' + email);
} else {
  Id walletId = wallets[0].Id;
  List<Task_Completion__c> completions = [
    SELECT Id
    FROM Task_Completion__c
    WHERE Wallet__c = :walletId
  ];
  List<Shop_Order__c> orders = [
    SELECT Id, Resume_Url__c
    FROM Shop_Order__c
    WHERE Wallet__c = :walletId
  ];
  Integer entries = [SELECT COUNT() FROM Points_Ledger__c WHERE Wallet__c = :walletId];

  // Resumes stored as private Salesforce files on the orders.
  Set<Id> fileIds = new Set<Id>();
  Set<Id> orderIds = new Map<Id, Shop_Order__c>(orders).keySet();
  if (!orderIds.isEmpty()) {
    for (ContentDocumentLink link : [
      SELECT ContentDocumentId
      FROM ContentDocumentLink
      WHERE LinkedEntityId IN :orderIds
    ]) {
      fileIds.add(link.ContentDocumentId);
    }
  }

  TriggerHandler.bypass('TaskCompletionTriggerHandler');
  delete completions;
  delete [SELECT Id FROM ContentDocument WHERE Id IN :fileIds];
  delete orders;
  delete wallets;
  TriggerHandler.clearBypass('TaskCompletionTriggerHandler');

  for (Shop_Order__c o : orders) {
    if (o.Resume_Url__c != null && o.Resume_Url__c.contains('.blob.vercel-storage.com')) {
      System.debug('Delete this Blob file by hand: ' + o.Resume_Url__c);
    }
  }
  System.debug(
    'Deleted ' +
      completions.size() +
      ' completions, ' +
      orders.size() +
      ' orders, ' +
      entries +
      ' ledger entries and 1 wallet for ' +
      email
  );
}
