@IsTest
private class OrderNotifierTest {
  private class Mock implements HttpCalloutMock {
    private Integer status;
    private Mock(Integer status) {
      this.status = status;
    }
    public HttpResponse respond(HttpRequest request) {
      HttpResponse response = new HttpResponse();
      response.setStatusCode(status);
      return response;
    }
  }

  @TestSetup
  static void setup() {
    TestDataFactory.createCatalog();
  }

  private static Shop_Order__c inProgress() {
    Wallet__c wallet = TestDataFactory.createWallet('notify@example.com', 100);
    return TestDataFactory.createOrder(wallet.Id, 'ask-sfcc-question', 'In Progress');
  }

  @IsTest
  static void deliveryPingsTheStorefront() {
    Test.setMock(HttpCalloutMock.class, new Mock(200));
    Shop_Order__c shopOrder = inProgress();
    Test.startTest();
    shopOrder.Status__c = 'Delivered';
    update shopOrder;
    Test.stopTest();
    Assert.areEqual(0, [SELECT COUNT() FROM Task]);
  }

  @IsTest
  static void aFailedPingLeavesATask() {
    Test.setMock(HttpCalloutMock.class, new Mock(503));
    Shop_Order__c shopOrder = inProgress();
    Test.startTest();
    shopOrder.Status__c = 'Cancelled';
    update shopOrder;
    Test.stopTest();
    Assert.areEqual(1, [SELECT COUNT() FROM Task WHERE Subject LIKE 'Email the visitor%']);
  }

  @IsTest
  static void aNoticeIsClaimedOnceAndCanBeReleased() {
    Test.setMock(HttpCalloutMock.class, new Mock(200));
    Shop_Order__c shopOrder = inProgress();
    Assert.isFalse(OrderNotifier.claim(shopOrder.Id).due, 'Not delivered yet');
    shopOrder.Status__c = 'Delivered';
    update shopOrder;
    OrderNotifier.Claim first = OrderNotifier.claim(shopOrder.Id);
    Assert.isTrue(first.due);
    Assert.areEqual('notify@example.com', first.email);
    Assert.isFalse(OrderNotifier.claim(shopOrder.Id).due);
    OrderNotifier.release(shopOrder.Id);
    Assert.isTrue(OrderNotifier.claim(shopOrder.Id).due);
  }
}
