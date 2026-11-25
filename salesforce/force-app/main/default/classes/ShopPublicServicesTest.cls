@IsTest
private class ShopPublicServicesTest {
  @TestSetup
  static void setup() {
    TestDataFactory.createCatalog();
  }

  private static Integer post(String path, Object body) {
    RestContext.request = new RestRequest();
    RestContext.response = new RestResponse();
    RestContext.request.requestURI = '/shop/v1/' + path;
    RestContext.request.requestBody = Blob.valueOf(JSON.serialize(body));
    ShopApi.doPost();
    return RestContext.response.statusCode;
  }

  @IsTest
  static void chatStartsSendsAndIsLimited() {
    Wallet__c wallet = TestDataFactory.createWallet('chat@example.com', 0);
    String base = 'wallets/' + wallet.Id + '/chat/';
    Assert.areEqual(200, post(base + 'start', new Map<String, Object>()));
    String key = [SELECT Chat_Key__c FROM Wallet__c].Chat_Key__c;
    Assert.areEqual(32, key.length());
    ConciergeService.replyForTest = 'Hello';
    Map<String, Object> message = new Map<String, Object>{ 'chatKey' => key, 'text' => 'Hi' };
    Assert.areEqual(200, post(base + 'message', message));
    Assert.isTrue(RestContext.response.responseBody.toString().contains('Hello'));
    Assert.areEqual(1, [SELECT Chat_Count__c FROM Wallet__c].Chat_Count__c);

    message.put('chatKey', 'x'.repeat(32));
    Assert.areEqual(409, post(base + 'message', message), 'Another key is refused');
    message.put('chatKey', key);
    message.put('text', ' ');
    Assert.areEqual(400, post(base + 'message', message));
    update new Wallet__c(Id = wallet.Id, Chat_Count__c = ConciergeService.DAILY_LIMIT);
    message.put('text', 'Hi');
    Assert.areEqual(409, post(base + 'message', message), 'Daily limit');
  }

  @IsTest
  static void chatHelpers() {
    Assert.areEqual('a', ConciergeService.textOf('{"type":"Text","value":"a"}'));
    Assert.areEqual('plain', ConciergeService.textOf('plain'));
    Assert.isNull(ConciergeService.walletFor(null));
    Assert.isNull(ConciergeService.walletFor('x'.repeat(32)));
    Wallet__c wallet = TestDataFactory.createWallet('gone@example.com', 0);
    Id walletId = wallet.Id;
    delete wallet;
    Assert.areEqual(404, post('wallets/' + walletId + '/chat/start', new Map<String, Object>()));
  }

  @IsTest
  static void emailGoesToOneAddressOrTheOwner() {
    Map<String, Object> email = new Map<String, Object>{
      'to' => 'a@example.com',
      'subject' => 'S',
      'html' => '<p>x</p>'
    };
    Assert.areEqual(200, post('email', email));
    email.put('to', 'a@example.com,b@example.com');
    Assert.areEqual(400, post('email', email));
    email.remove('to');
    Assert.areEqual(400, post('email', email));
    email.put('toOwner', true);
    Assert.areEqual(200, post('email', email));
    Assert.isTrue(ShopEmailService.lastSent);
  }

  @IsTest
  static void resumeIsStoredAsAFileOnTheOrder() {
    Wallet__c wallet = TestDataFactory.createWallet('resume@example.com', 400);
    Shop_Order__c shopOrder = TestDataFactory.createOrder(
      wallet.Id,
      'resume-review',
      OrderService.AWAITING_DETAILS
    );
    String path = 'wallets/' + wallet.Id + '/orders/' + shopOrder.Id + '/resume';
    Assert.areEqual(400, post(path, pdf('not a pdf file')));
    Assert.areEqual(400, post(path, new Map<String, Object>{ 'pdf' => null }));
    Assert.areEqual(200, post(path, pdf('%PDF-1.4 test')));
    Shop_Order__c saved = [SELECT Status__c, Resume_Url__c FROM Shop_Order__c];
    Assert.areEqual(OrderService.IN_PROGRESS, saved.Status__c);
    Assert.isTrue(saved.Resume_Url__c.contains('/ContentDocument/'));
    Assert.areEqual(1, [SELECT COUNT() FROM ContentVersion WHERE FirstPublishLocationId = :shopOrder.Id]);
    Assert.areEqual(409, post(path, pdf('%PDF-1.4 test')));
  }

  private static Map<String, Object> pdf(String text) {
    return new Map<String, Object>{ 'pdf' => EncodingUtil.base64Encode(Blob.valueOf(text)) };
  }
}
