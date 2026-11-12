@IsTest
private class OrderServiceTest {
  private static final String QUESTION = 'How do I extend a SCAPI endpoint with a hook?';

  @TestSetup
  static void setup() {
    TestDataFactory.createCatalog();
  }

  private static Wallet__c wallet(String email, Integer points) {
    return TestDataFactory.createWallet(email, points);
  }

  private static String codeOf(Exception e) {
    return e instanceof ShopException ? ((ShopException) e).code : null;
  }

  @IsTest
  static void questionMovesOrderToInProgress() {
    Wallet__c w = wallet('q@example.com', 100);
    Shop_Order__c o = TestDataFactory.createOrder(w.Id, 'ask-sfcc-question', 'Awaiting Details');
    ShopDtos.OrderDto dto = OrderService.saveDetails(w.Id, o.Id, '  ' + QUESTION + '  ', null);
    Assert.areEqual('In Progress', dto.status);
    Assert.areEqual(QUESTION, dto.question);
  }

  @IsTest
  static void resumeUrlOnAResumeOrder() {
    Wallet__c w = wallet('r@example.com', 250);
    Shop_Order__c o = TestDataFactory.createOrder(w.Id, 'resume-review', 'Awaiting Details');
    String url = 'https://abc.public.blob.vercel-storage.com/resumes/' + o.Id + '/cv.pdf';
    ShopDtos.OrderDto dto = OrderService.saveDetails(w.Id, o.Id, null, url);
    Assert.areEqual(url, dto.resumeUrl);
    Assert.areEqual('In Progress', dto.status);
  }

  @IsTest
  static void wrongOrMissingInputIsRejected() {
    Wallet__c w = wallet('wrong@example.com', 100);
    Shop_Order__c o = TestDataFactory.createOrder(w.Id, 'ask-sfcc-question', 'Awaiting Details');
    List<List<String>> cases = new List<List<String>>{
      new List<String>{ null, 'https://example.com/cv.pdf' }, // resume on a Question order
      new List<String>{ 'too short', null },
      new List<String>{ null, null },
      new List<String>{ QUESTION, 'https://example.com/cv.pdf' }
    };
    for (List<String> c : cases) {
      try {
        OrderService.saveDetails(w.Id, o.Id, c[0], c[1]);
        Assert.fail('Expected VALIDATION for ' + c);
      } catch (ShopException e) {
        Assert.areEqual(ShopException.VALIDATION, e.code);
      }
    }
  }

  @IsTest
  static void anotherWalletsOrderIsNotFound() {
    Wallet__c owner = wallet('owner@example.com', 100);
    Wallet__c other = wallet('other@example.com', 0);
    Shop_Order__c o = TestDataFactory.createOrder(
      owner.Id,
      'ask-sfcc-question',
      'Awaiting Details'
    );
    try {
      OrderService.saveDetails(other.Id, o.Id, QUESTION, null);
      Assert.fail('Expected NOT_FOUND');
    } catch (ShopException e) {
      Assert.areEqual(ShopException.NOT_FOUND, e.code);
    }
    try {
      OrderService.getOrder(other.Id, o.Id);
      Assert.fail('Expected NOT_FOUND');
    } catch (ShopException e) {
      Assert.areEqual(ShopException.NOT_FOUND, e.code);
    }
  }

  @IsTest
  static void detailsOnAnInProgressOrderIsInvalidState() {
    Wallet__c w = wallet('twice@example.com', 100);
    Shop_Order__c o = TestDataFactory.createOrder(w.Id, 'ask-sfcc-question', 'In Progress');
    try {
      OrderService.saveDetails(w.Id, o.Id, QUESTION, null);
      Assert.fail('Expected INVALID_STATE');
    } catch (ShopException e) {
      Assert.areEqual(ShopException.INVALID_STATE, e.code);
    }
  }

  @IsTest
  static void bookingIsSavedAndRepeatsAreAccepted() {
    Wallet__c w = wallet('book@example.com', 300);
    Shop_Order__c o = TestDataFactory.createOrder(w.Id, 'career-chat', 'Awaiting Details');
    Datetime start = Datetime.newInstanceGmt(2026, 12, 1, 10, 0, 0);
    ShopDtos.OrderDto dto = OrderService.saveBooking(w.Id, o.Id, 'cal-uid-1', start);
    Assert.areEqual('In Progress', dto.status);
    Assert.areEqual(start, dto.bookingStart);
    ShopDtos.OrderDto again = OrderService.saveBooking(w.Id, o.Id, 'cal-uid-1', start);
    Assert.areEqual('In Progress', again.status);

    try {
      OrderService.saveBooking(w.Id, o.Id, 'cal-uid-2', start);
      Assert.fail('Expected INVALID_STATE for a different booking');
    } catch (ShopException e) {
      Assert.areEqual(ShopException.INVALID_STATE, e.code);
    }
  }

  @IsTest
  static void bookingOnANonBookingOrderIsRejected() {
    Wallet__c w = wallet('nobook@example.com', 100);
    Shop_Order__c o = TestDataFactory.createOrder(w.Id, 'ask-sfcc-question', 'Awaiting Details');
    try {
      OrderService.saveBooking(w.Id, o.Id, 'cal-uid', System.now());
      Assert.fail('Expected VALIDATION');
    } catch (ShopException e) {
      Assert.areEqual(ShopException.VALIDATION, e.code);
    }
  }

  @IsTest
  static void cancellingRefundsOnce() {
    Wallet__c w = wallet('cancel@example.com', 300);
    Shop_Order__c o = TestDataFactory.createOrder(w.Id, 'career-chat', 'Awaiting Details');
    Assert.areEqual(0, TestDataFactory.balance(w.Id));

    o.Status__c = 'Cancelled';
    update o;
    Assert.areEqual(300, TestDataFactory.balance(w.Id));
    Points_Ledger__c refund = [
      SELECT Amount__c, Idempotency_Key__c
      FROM Points_Ledger__c
      WHERE Entry_Type__c = 'Refund'
    ];
    Assert.areEqual(300, refund.Amount__c);
    Assert.areEqual('refund:' + o.Id, refund.Idempotency_Key__c);
    Assert.isNotNull([SELECT Cancelled_At__c FROM Shop_Order__c WHERE Id = :o.Id].Cancelled_At__c);
  }

  @IsTest
  static void terminalStatusesAreLocked() {
    Wallet__c w = wallet('locked@example.com', 400);
    Shop_Order__c delivered = TestDataFactory.createOrder(w.Id, 'ask-sfcc-question', 'Delivered');
    Shop_Order__c cancelled = TestDataFactory.createOrder(w.Id, 'career-chat', 'Cancelled');
    for (Shop_Order__c o : new List<Shop_Order__c>{ delivered, cancelled }) {
      o.Status__c = 'In Progress';
      try {
        update o;
        Assert.fail('Expected a validation error');
      } catch (DmlException e) {
        Assert.isTrue(e.getMessage().contains('cannot change status'));
      }
    }
    Assert.isNotNull(
      [SELECT Delivered_At__c FROM Shop_Order__c WHERE Id = :delivered.Id].Delivered_At__c
    );
  }

  @IsTest
  static void deliveredNeedsInputFirst() {
    Wallet__c w = wallet('early@example.com', 100);
    Shop_Order__c o = TestDataFactory.createOrder(w.Id, 'ask-sfcc-question', 'Awaiting Details');
    o.Status__c = 'Delivered';
    try {
      update o;
      Assert.fail('Expected a validation error');
    } catch (DmlException e) {
      Assert.isTrue(e.getMessage().contains('before marking the order Delivered'));
    }
  }

  @IsTest
  static void reviewOnADeliveredOrderAwardsPointsOnce() {
    Wallet__c w = wallet('review@example.com', 100);
    Shop_Order__c o = TestDataFactory.createOrder(w.Id, 'ask-sfcc-question', 'Delivered');
    ShopDtos.ReviewResult first = OrderService.submitReview(w.Id, o.Id, 5, 'Clear and fast.');
    Assert.areEqual(75, first.pointsAwarded);
    Assert.isFalse(first.replay);
    Assert.areEqual(75, first.balance);
    Assert.areEqual(5, first.orderDto.review.rating);

    ShopDtos.ReviewResult second = OrderService.submitReview(w.Id, o.Id, 4, 'Changed my mind');
    Assert.isTrue(second.replay);
    Assert.areEqual(0, second.pointsAwarded);
    Assert.areEqual(5, second.orderDto.review.rating, 'The first review is kept');
    Assert.areEqual(75, TestDataFactory.balance(w.Id));
  }

  @IsTest
  static void reviewIsRejectedWhenNotDeliveredOrOutOfRange() {
    Wallet__c w = wallet('notyet@example.com', 100);
    Shop_Order__c o = TestDataFactory.createOrder(w.Id, 'ask-sfcc-question', 'In Progress');
    try {
      OrderService.submitReview(w.Id, o.Id, 5, null);
      Assert.fail('Expected INVALID_STATE');
    } catch (ShopException e) {
      Assert.areEqual(ShopException.INVALID_STATE, e.code);
    }
    try {
      OrderService.submitReview(w.Id, o.Id, 6, null);
      Assert.fail('Expected VALIDATION');
    } catch (ShopException e) {
      Assert.areEqual(ShopException.VALIDATION, e.code);
    }
  }

  @IsTest
  static void reviewOverTheLimitIsNotSaved() {
    Wallet__c w = wallet('many@example.com', 100);
    Shop_Order__c o = TestDataFactory.createOrder(w.Id, 'ask-sfcc-question', 'Delivered');
    // Ten earlier reviews use up the review task's limit.
    Test.startTest();
    for (Integer i = 0; i < 10; i++) {
      EarnService.awardSystemTask(w.Id, 'review', 'earlier-order-' + i);
    }
    Test.stopTest();
    try {
      OrderService.submitReview(w.Id, o.Id, 5, 'Eleventh');
      Assert.fail('Expected TASK_LIMIT_REACHED');
    } catch (ShopException e) {
      Assert.areEqual(ShopException.TASK_LIMIT_REACHED, e.code);
    }
    Assert.isNull(
      [SELECT Review_Rating__c FROM Shop_Order__c WHERE Id = :o.Id].Review_Rating__c,
      'The savepoint rollback discards the review'
    );
  }

  @IsTest
  static void listOrdersReturnsNewestFirst() {
    Wallet__c w = wallet('list@example.com', 1000);
    TestDataFactory.createOrder(w.Id, 'ask-sfcc-question', 'Awaiting Details');
    TestDataFactory.createOrder(w.Id, 'resume-review', 'Awaiting Details');
    List<ShopDtos.OrderDto> orders = OrderService.listOrders(w.Id);
    Assert.areEqual(2, orders.size());
    Assert.areEqual('resume-review', orders[0].offering.slug);
  }
}
