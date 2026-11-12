@IsTest
private class ShopApiTest {
  private static final String KEY = '6f1c2b8e-1d2a-4c3b-9e8f-000000000002';

  @TestSetup
  static void setup() {
    TestDataFactory.createCatalog();
  }

  private static Map<String, Object> call(String method, String path, String body) {
    RestRequest req = new RestRequest();
    req.requestURI = '/services/apexrest/shop/v1/' + path;
    req.httpMethod = method;
    req.requestBody = body == null ? null : Blob.valueOf(body);
    RestContext.request = req;
    RestContext.response = new RestResponse();
    if (method == 'GET') {
      ShopApi.doGet();
    } else {
      ShopApi.doPost();
    }
    RestResponse res = RestContext.response;
    Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(
      res.responseBody.toString()
    );
    parsed.put('_status', res.statusCode);
    return parsed;
  }

  private static String errorCode(Map<String, Object> response) {
    return (String) ((Map<String, Object>) response.get('error')).get('code');
  }

  @IsTest
  static void catalogReturnsOfferingsAndTasks() {
    Map<String, Object> res = call('GET', 'catalog', null);
    Assert.areEqual(200, res.get('_status'));
    Assert.areEqual(4, ((List<Object>) res.get('offerings')).size());
    Assert.areEqual(8, ((List<Object>) res.get('tasks')).size());
    Map<String, Object> first = (Map<String, Object>) ((List<Object>) res.get('offerings'))[0];
    Assert.areEqual('ask-sfcc-question', first.get('slug'));
    Assert.isTrue(first.containsKey('bookingUrl'), 'Null fields are still present');
  }

  @IsTest
  static void fullVisitorJourneyThroughTheApi() {
    Test.startTest();
    Map<String, Object> verify = call(
      'POST',
      'auth/verify',
      '{"email":"journey@example.com","issuedAt":1762900000000}'
    );
    Assert.areEqual(200, verify.get('_status'));
    Assert.areEqual(true, verify.get('isNew'));
    Map<String, Object> wallet = (Map<String, Object>) verify.get('wallet');
    String walletId = (String) wallet.get('id');
    Assert.areEqual(50, wallet.get('balance'));

    Map<String, Object> explore = call('POST', 'wallets/' + walletId + '/tasks/explore', null);
    Assert.areEqual(200, explore.get('_status'), 'Empty body is allowed for tasks');
    Assert.areEqual(80, explore.get('balance'));
    call('POST', 'wallets/' + walletId + '/tasks/linkedin-post', '{}');

    Map<String, Object> checkout = call(
      'POST',
      'wallets/' + walletId + '/checkout',
      '{"checkoutKey":"' + KEY + '","offerings":["ask-sfcc-question"]}'
    );
    Assert.areEqual(200, checkout.get('_status'));
    Assert.areEqual(0, checkout.get('balance'));
    Map<String, Object> firstOrder = (Map<String, Object>) ((List<Object>) checkout.get(
      'orders'
    ))[0];
    String orderId = (String) firstOrder.get('id');
    Assert.isTrue(((String) firstOrder.get('orderNumber')).startsWith('PS-'));

    Map<String, Object> details = call(
      'POST',
      'wallets/' + walletId + '/orders/' + orderId + '/details',
      '{"question":"How do I add a custom SCAPI endpoint?"}'
    );
    Assert.areEqual(200, details.get('_status'));
    Assert.areEqual('In Progress', ((Map<String, Object>) details.get('order')).get('status'));

    Map<String, Object> one = call('GET', 'wallets/' + walletId + '/orders/' + orderId, null);
    Assert.areEqual(orderId, ((Map<String, Object>) one.get('order')).get('id'));
    Map<String, Object> orderList = call('GET', 'wallets/' + walletId + '/orders', null);
    Assert.areEqual(1, ((List<Object>) orderList.get('orders')).size());
    Map<String, Object> summary = call('GET', 'wallets/' + walletId, null);
    Assert.areEqual(0, ((Map<String, Object>) summary.get('wallet')).get('balance'));
    Test.stopTest();
  }

  @IsTest
  static void bookingAndReviewRoutes() {
    Wallet__c w = TestDataFactory.createWallet('routes@example.com', 600);
    Shop_Order__c booking = TestDataFactory.createOrder(w.Id, 'career-chat', 'Awaiting Details');
    Shop_Order__c delivered = TestDataFactory.createOrder(w.Id, 'ask-sfcc-question', 'Delivered');

    Test.startTest();
    Map<String, Object> booked = call(
      'POST',
      'wallets/' + w.Id + '/orders/' + booking.Id + '/booking',
      '{"bookingUid":"cal-1","bookingStart":"2026-12-01T10:00:00.000Z"}'
    );
    Assert.areEqual(200, booked.get('_status'));

    Map<String, Object> review = call(
      'POST',
      'wallets/' + w.Id + '/orders/' + delivered.Id + '/review',
      '{"rating":5,"text":"Great"}'
    );
    Assert.areEqual(200, review.get('_status'));
    Assert.areEqual(75, review.get('pointsAwarded'));
    Assert.areEqual(false, review.get('replay'));
    Assert.isTrue(review.containsKey('order'));
    Test.stopTest();
  }

  @IsTest
  static void errorCodesMapToHttpStatuses() {
    Wallet__c w = TestDataFactory.createWallet('errors@example.com', 0);
    String base = 'wallets/' + w.Id;

    Map<String, Object> notFound = call('GET', 'nothing-here', null);
    Assert.areEqual(404, notFound.get('_status'));
    Assert.areEqual('NOT_FOUND', errorCode(notFound));

    Assert.areEqual(404, call('GET', 'wallets/not-an-id', null).get('_status'));

    Map<String, Object> badJson = call('POST', base + '/checkout', '{not json');
    Assert.areEqual(400, badJson.get('_status'));
    Assert.areEqual('VALIDATION', errorCode(badJson));

    Map<String, Object> unknownField = call('POST', base + '/checkout', '{"surprise":true}');
    Assert.areEqual(400, unknownField.get('_status'));

    Assert.areEqual(400, call('POST', base + '/checkout', null).get('_status'), 'Body required');

    Map<String, Object> tooPoor = call(
      'POST',
      base + '/checkout',
      '{"checkoutKey":"' + KEY + '","offerings":["ask-sfcc-question"]}'
    );
    Assert.areEqual(409, tooPoor.get('_status'));
    Assert.areEqual('INSUFFICIENT_POINTS', errorCode(tooPoor));

    Assert.areEqual(400, call('POST', base + '/tasks/signup', null).get('_status'));

    call('POST', 'auth/verify', '{"email":"twice@example.com","issuedAt":5}');
    Map<String, Object> reused = call(
      'POST',
      'auth/verify',
      '{"email":"twice@example.com","issuedAt":5}'
    );
    Assert.areEqual(401, reused.get('_status'));
    Assert.areEqual('UNAUTHORIZED', errorCode(reused));
  }

  @IsTest
  static void unexpectedErrorsReturn500WithoutDetails() {
    ShopApi.forceException = new NullPointerException();
    Map<String, Object> res = call('GET', 'catalog', null);
    Assert.areEqual(500, res.get('_status'));
    Assert.areEqual('INTERNAL', errorCode(res));
    Assert.areEqual(
      'Something went wrong.',
      ((Map<String, Object>) res.get('error')).get('message')
    );
  }

  @IsTest
  static void statusMapCoversEveryCode() {
    Assert.areEqual(400, ShopApi.statusFor('VALIDATION'));
    Assert.areEqual(401, ShopApi.statusFor('UNAUTHORIZED'));
    Assert.areEqual(404, ShopApi.statusFor('NOT_FOUND'));
    Assert.areEqual(409, ShopApi.statusFor('INSUFFICIENT_POINTS'));
    Assert.areEqual(409, ShopApi.statusFor('TASK_LIMIT_REACHED'));
    Assert.areEqual(409, ShopApi.statusFor('INVALID_STATE'));
    Assert.areEqual(500, ShopApi.statusFor('INTERNAL'));
  }

  @IsTest
  static void segmentsIgnoreQueryStringsAndBlanks() {
    Assert.areEqual(
      new List<String>{ 'wallets', 'abc', 'orders' },
      ShopApi.segments('/services/apexrest/shop/v1/wallets/abc//orders/?x=1')
    );
    Assert.areEqual(0, ShopApi.segments('/services/apexrest/other').size());
  }
}
