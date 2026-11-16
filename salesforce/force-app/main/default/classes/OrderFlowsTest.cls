@IsTest
private class OrderFlowsTest {
  @TestSetup
  static void setup() {
    TestDataFactory.createCatalog();
  }

  @IsTest
  static void deliveredFlowRunsWithoutErrors() {
    Wallet__c wallet = TestDataFactory.createWallet('flow-delivered@example.com', 100);
    Shop_Order__c shopOrder = TestDataFactory.createOrder(
      wallet.Id,
      'ask-sfcc-question',
      'In Progress'
    );
    Test.startTest();
    shopOrder.Status__c = 'Delivered';
    update shopOrder;
    Test.stopTest();
    Assert.areEqual(
      'Delivered',
      [SELECT Status__c FROM Shop_Order__c WHERE Id = :shopOrder.Id].Status__c
    );
  }

  @IsTest
  static void cancelledFlowRunsWithoutErrorsAndPointsReturn() {
    Wallet__c wallet = TestDataFactory.createWallet('flow-cancelled@example.com', 300);
    Shop_Order__c shopOrder = TestDataFactory.createOrder(
      wallet.Id,
      'career-chat',
      'Awaiting Details'
    );
    Test.startTest();
    shopOrder.Status__c = 'Cancelled';
    update shopOrder;
    Test.stopTest();
    Assert.areEqual(300, TestDataFactory.balance(wallet.Id));
  }
}
