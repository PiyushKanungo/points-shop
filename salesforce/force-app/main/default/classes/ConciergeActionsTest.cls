@IsTest
private class ConciergeActionsTest {
  @TestSetup
  static void setup() {
    TestDataFactory.createCatalog();
  }

  private static ConciergeStartOrder.Output order(Id walletId, String sessionKey, String slug) {
    ConciergeStartOrder.Input input = new ConciergeStartOrder.Input();
    input.walletId = walletId;
    input.sessionKey = sessionKey;
    input.offeringSlug = slug;
    return ConciergeStartOrder.run(new List<ConciergeStartOrder.Input>{ input })[0];
  }

  @IsTest
  static void balanceAndSummary() {
    Wallet__c wallet = TestDataFactory.createWallet('agent-balance@example.com', 120);
    ConciergeGetBalance.Input input = new ConciergeGetBalance.Input();
    input.walletId = wallet.Id;
    ConciergeGetBalance.Output output = ConciergeGetBalance.run(
      new List<ConciergeGetBalance.Input>{ input }
    )[0];
    Assert.areEqual(120, output.balance);
    Assert.isTrue(output.summary.contains('+120'));
  }

  @IsTest
  static void unreadableWalletGivesAMessage() {
    ConciergeGetBalance.Input input = new ConciergeGetBalance.Input();
    input.walletId = 'not-an-id';
    ConciergeGetBalance.Output output = ConciergeGetBalance.run(
      new List<ConciergeGetBalance.Input>{ input }
    )[0];
    Assert.areEqual(0, output.balance);
    Assert.isTrue(output.summary.contains('could not be read'));
  }

  @IsTest
  static void catalogueWithAndWithoutAWallet() {
    Wallet__c wallet = TestDataFactory.createWallet('agent-catalog@example.com', 40);
    EarnService.completeTask(wallet.Id, 'explore', null);

    ConciergeGetCatalog.Input signedIn = new ConciergeGetCatalog.Input();
    signedIn.walletId = wallet.Id;
    ConciergeGetCatalog.Input signedOut = new ConciergeGetCatalog.Input();
    List<ConciergeGetCatalog.Output> outputs = ConciergeGetCatalog.run(
      new List<ConciergeGetCatalog.Input>{ signedIn, signedOut }
    );

    Assert.areEqual(70, outputs[0].balance);
    Assert.isTrue(outputs[0].offerings.contains('slug=ask-sfcc-question'));
    Assert.isFalse(outputs[0].tasksLeft.contains('Explore the site'), 'Done tasks are hidden');
    Assert.isTrue(outputs[0].tasksLeft.contains('Give feedback'));
    Assert.isFalse(outputs[0].tasksLeft.contains('Sign up'), 'System tasks are hidden');
    Assert.areEqual(0, outputs[1].balance);
    Assert.isTrue(outputs[1].tasksLeft.contains('Explore the site'));
  }

  @IsTest
  static void orderSucceedsOnceAndRepeatsAsAReplay() {
    Wallet__c wallet = TestDataFactory.createWallet('agent-order@example.com', 150);
    String sessionKey = '7d3b2a10-1111-4c22-9a33-abcdefabcdef';
    ConciergeStartOrder.Output first = order(wallet.Id, sessionKey, 'ask-sfcc-question');
    Assert.isTrue(first.success, first.message);
    Assert.areEqual(50, first.balance);
    Assert.isTrue(first.orderNumber.startsWith('PS-'));

    ConciergeStartOrder.Output again = order(wallet.Id, sessionKey, 'ask-sfcc-question');
    Assert.isTrue(again.success);
    Assert.isTrue(again.message.startsWith('This order was already placed'));
    Assert.areEqual(1, [SELECT COUNT() FROM Shop_Order__c]);
    Assert.areEqual(50, TestDataFactory.balance(wallet.Id));
  }

  @IsTest
  static void notEnoughPointsOrUnknownOfferingGiveMessages() {
    Wallet__c wallet = TestDataFactory.createWallet('agent-poor@example.com', 10);
    ConciergeStartOrder.Output poor = order(wallet.Id, 'session-key-1234', 'mock-interview');
    Assert.isFalse(poor.success);
    Assert.isTrue(poor.message.startsWith('Not enough points'));

    ConciergeStartOrder.Output unknown = order(wallet.Id, 'session-key-1234', 'no-such-thing');
    Assert.isFalse(unknown.success);
    Assert.isTrue(unknown.message.contains('does not exist'));
    Assert.areEqual(0, [SELECT COUNT() FROM Shop_Order__c]);
  }

  @IsTest
  static void checkoutKeyIsValidForAnySlug() {
    String key = ConciergeStartOrder.checkoutKeyFor(
      '7d3b2a10-1111-4c22-9a33-abcdefabcdef',
      'a-very-long-offering-slug-that-goes-on-and-on-past-forty-characters'
    );
    Assert.isTrue(key.length() <= 80);
    Assert.isTrue(Pattern.matches('^[A-Za-z0-9:_-]{8,80}$', key));
  }
}
