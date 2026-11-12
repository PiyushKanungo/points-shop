@IsTest
private class CheckoutServiceTest {
  private static final String KEY = '6f1c2b8e-1d2a-4c3b-9e8f-000000000001';

  @TestSetup
  static void setup() {
    TestDataFactory.createCatalog();
  }

  private static String codeOfCheckout(Id walletId, String key, List<String> slugs) {
    try {
      CheckoutService.checkout(walletId, key, slugs);
    } catch (ShopException e) {
      return e.code;
    }
    return null;
  }

  @IsTest
  static void exactBalanceBuysAnOffering() {
    Wallet__c w = TestDataFactory.createWallet('buyer@example.com', 100);
    ShopDtos.CheckoutResult result = CheckoutService.checkout(
      w.Id,
      KEY,
      new List<String>{ 'ask-sfcc-question' }
    );
    Assert.isFalse(result.replay);
    Assert.areEqual(0, result.balance);
    Assert.areEqual(1, result.orders.size());
    ShopDtos.OrderDto dto = result.orders[0];
    Assert.areEqual('Awaiting Details', dto.status);
    Assert.areEqual(100, dto.pointsSpent);
    Assert.areEqual('ask-sfcc-question', dto.offering.slug);
    Assert.areEqual('Question', dto.offering.fulfilmentType);

    Points_Ledger__c redeem = [
      SELECT Amount__c, Entry_Type__c, Idempotency_Key__c, Shop_Order__c, Reason__c
      FROM Points_Ledger__c
      WHERE Entry_Type__c = 'Redeem'
    ];
    Assert.areEqual(-100, redeem.Amount__c);
    Assert.areEqual(dto.id, redeem.Shop_Order__c);
    Assert.areEqual(
      'redeem:' + CheckoutService.orderKey(w.Id, KEY, 'ask-sfcc-question'),
      redeem.Idempotency_Key__c
    );
    Assert.areEqual('Order ' + dto.orderNumber, redeem.Reason__c);
  }

  @IsTest
  static void onePointShortPlacesNothing() {
    Wallet__c w = TestDataFactory.createWallet('short@example.com', 99);
    Assert.areEqual(
      ShopException.INSUFFICIENT_POINTS,
      codeOfCheckout(w.Id, KEY, new List<String>{ 'ask-sfcc-question' })
    );
    Assert.areEqual(0, [SELECT COUNT() FROM Shop_Order__c]);
    Assert.areEqual(99, TestDataFactory.balance(w.Id));
  }

  @IsTest
  static void twoOfferingsMakeTwoOrders() {
    Wallet__c w = TestDataFactory.createWallet('two@example.com', 400);
    ShopDtos.CheckoutResult result = CheckoutService.checkout(
      w.Id,
      KEY,
      new List<String>{ 'ask-sfcc-question', 'career-chat' }
    );
    Assert.areEqual(2, result.orders.size());
    Assert.areEqual(0, result.balance);
    Assert.areEqual(2, [SELECT COUNT() FROM Points_Ledger__c WHERE Entry_Type__c = 'Redeem']);
  }

  @IsTest
  static void sameKeyTwiceIsAReplay() {
    Wallet__c w = TestDataFactory.createWallet('replay@example.com', 1000);
    List<String> slugs = new List<String>{ 'ask-sfcc-question', 'resume-review' };
    ShopDtos.CheckoutResult first = CheckoutService.checkout(w.Id, KEY, slugs);
    ShopDtos.CheckoutResult second = CheckoutService.checkout(w.Id, KEY, slugs);
    Assert.isTrue(second.replay);
    Assert.areEqual(2, second.orders.size());
    Assert.areEqual(first.orders[0].id, second.orders[0].id);
    Assert.areEqual(2, [SELECT COUNT() FROM Shop_Order__c]);
    Assert.areEqual(650, second.balance);
  }

  @IsTest
  static void unknownOrInactiveOfferingPlacesNothing() {
    Wallet__c w = TestDataFactory.createWallet('missing@example.com', 1000);
    Assert.areEqual(
      ShopException.NOT_FOUND,
      codeOfCheckout(w.Id, KEY, new List<String>{ 'ask-sfcc-question', 'no-such-thing' })
    );
    Service__c chat = [SELECT Id FROM Service__c WHERE Slug__c = 'career-chat'];
    chat.Active__c = false;
    update chat;
    Assert.areEqual(
      ShopException.NOT_FOUND,
      codeOfCheckout(w.Id, KEY, new List<String>{ 'career-chat' })
    );
    Assert.areEqual(0, [SELECT COUNT() FROM Shop_Order__c]);
    Assert.areEqual(1, [SELECT COUNT() FROM Points_Ledger__c], 'Only the starting balance');
  }

  @IsTest
  static void badBasketsAreRejected() {
    Wallet__c w = TestDataFactory.createWallet('bad@example.com', 1000);
    Assert.areEqual(
      ShopException.VALIDATION,
      codeOfCheckout(w.Id, KEY, new List<String>{ 'career-chat', 'career-chat' }),
      'duplicate slug'
    );
    Assert.areEqual(
      ShopException.VALIDATION,
      codeOfCheckout(w.Id, KEY, new List<String>{ 'a', 'b', 'c', 'd', 'e' }),
      'five slugs'
    );
    Assert.areEqual(
      ShopException.VALIDATION,
      codeOfCheckout(w.Id, KEY, new List<String>()),
      'empty'
    );
    Assert.areEqual(
      ShopException.VALIDATION,
      codeOfCheckout(w.Id, 'bad key!', new List<String>{ 'career-chat' }),
      'bad key'
    );
  }

  @IsTest
  static void failurePartWayRollsBackEverything() {
    Wallet__c w = TestDataFactory.createWallet('rollback@example.com', 1000);
    CheckoutService.failAfterOrderInsert = true;
    Assert.areEqual(
      ShopException.INTERNAL,
      codeOfCheckout(w.Id, KEY, new List<String>{ 'ask-sfcc-question' })
    );
    Assert.areEqual(0, [SELECT COUNT() FROM Shop_Order__c]);
    Assert.areEqual(1000, TestDataFactory.balance(w.Id));
  }

  @IsTest
  static void duplicateOrderKeyIsRejectedByTheDatabase() {
    Wallet__c w = TestDataFactory.createWallet('guard@example.com', 1000);
    CheckoutService.checkout(w.Id, KEY, new List<String>{ 'ask-sfcc-question' });
    Service__c offering = [SELECT Id FROM Service__c WHERE Slug__c = 'ask-sfcc-question'];
    try {
      insert new Shop_Order__c(
        Wallet__c = w.Id,
        Service__c = offering.Id,
        Checkout_Key__c = KEY,
        Order_Key__c = CheckoutService.orderKey(w.Id, KEY, 'ask-sfcc-question'),
        Points_Spent__c = 100,
        Status__c = 'Awaiting Details'
      );
      Assert.fail('Expected a duplicate error');
    } catch (DmlException e) {
      Assert.areEqual(StatusCode.DUPLICATE_VALUE, e.getDmlType(0));
    }
  }
}
