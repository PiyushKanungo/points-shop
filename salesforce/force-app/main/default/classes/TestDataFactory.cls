/**
 * Test data for Points Shop Apex tests. Mirrors the seed data in salesforce/data.
 */
@IsTest
public class TestDataFactory {
  private static Integer orderCounter = 0;

  public static void createCatalog() {
    insert new List<Service__c>{
      offering('Ask an SFCC developer', 'ask-sfcc-question', 100, 'Question', null, 10),
      offering('Resume review', 'resume-review', 250, 'Resume', null, 20),
      offering(
        '20-minute career chat',
        'career-chat',
        300,
        'Booking',
        'https://cal.com/test/chat',
        30
      ),
      offering(
        'Mock SFCC interview',
        'mock-interview',
        500,
        'Booking',
        'https://cal.com/test/mock',
        40
      )
    };
    insert new List<Earn_Task__c>{
      task('Sign up with email', 'signup', 50, 'System', 1, 10),
      task('Explore the site', 'explore', 30, 'Honour', 1, 20),
      task('Give feedback on the site', 'feedback', 50, 'Form', 1, 30),
      task('Send Piyush an email', 'email-piyush', 40, 'Form', 1, 40),
      task('Read and react to a LinkedIn post', 'linkedin-post', 20, 'Honour', 1, 50),
      task('Say hi on LinkedIn', 'linkedin-hi', 20, 'Honour', 1, 60),
      task('Refer a friend who signs up', 'referral', 100, 'Referral', 5, 70),
      task('Review a delivered order', 'review', 75, 'Review', 10, 80)
    };
  }

  public static Service__c offering(
    String name,
    String slug,
    Integer points,
    String fulfilmentType,
    String bookingUrl,
    Integer sortOrder
  ) {
    return new Service__c(
      Name = name,
      Slug__c = slug,
      Points_Price__c = points,
      Fulfilment_Type__c = fulfilmentType,
      Booking_Url__c = bookingUrl,
      Delivery_Promise__c = 'Test promise',
      Active__c = true,
      Sort_Order__c = sortOrder
    );
  }

  public static Earn_Task__c task(
    String name,
    String key,
    Integer points,
    String verification,
    Integer maxPerWallet,
    Integer sortOrder
  ) {
    return new Earn_Task__c(
      Name = name,
      Key__c = key,
      Points__c = points,
      Verification__c = verification,
      Max_Per_Wallet__c = maxPerWallet,
      Active__c = true,
      Sort_Order__c = sortOrder
    );
  }

  /** Inserts a wallet and, if startingPoints > 0, an Adjustment entry through LedgerService. */
  public static Wallet__c createWallet(String email, Integer startingPoints) {
    Wallet__c wallet = new Wallet__c(Email__c = email);
    insert wallet;
    if (startingPoints != null && startingPoints > 0) {
      LedgerService.post(
        new LedgerService.Posting(
          wallet.Id,
          startingPoints,
          LedgerService.ADJUSTMENT,
          'Test starting balance',
          'test-start:' + wallet.Id,
          null,
          null
        )
      );
    }
    return wallet;
  }

  /**
   * Inserts an order for the offering, posts its Redeem entry (the wallet must hold enough
   * points), then moves it to the requested status (via In Progress for Delivered).
   */
  public static Shop_Order__c createOrder(Id walletId, String slug, String status) {
    orderCounter++;
    Service__c offering = [SELECT Id, Points_Price__c FROM Service__c WHERE Slug__c = :slug];
    String checkoutKey = 'test-' + orderCounter + '-key';
    Shop_Order__c shopOrder = new Shop_Order__c(
      Wallet__c = walletId,
      Service__c = offering.Id,
      Checkout_Key__c = checkoutKey,
      Order_Key__c = CheckoutService.orderKey(walletId, checkoutKey, slug),
      Points_Spent__c = offering.Points_Price__c,
      Status__c = OrderService.AWAITING_DETAILS
    );
    insert shopOrder;
    LedgerService.post(
      new LedgerService.Posting(
        walletId,
        -offering.Points_Price__c.intValue(),
        LedgerService.REDEEM,
        'Test order',
        'redeem:' + shopOrder.Order_Key__c,
        null,
        shopOrder.Id
      )
    );
    if (status == OrderService.IN_PROGRESS || status == OrderService.DELIVERED) {
      shopOrder.Status__c = OrderService.IN_PROGRESS;
      update shopOrder;
    }
    if (status == OrderService.DELIVERED || status == ShopOrderTriggerHandler.CANCELLED) {
      shopOrder.Status__c = status;
      update shopOrder;
    }
    return [
      SELECT Id, Name, Status__c, Order_Key__c, Points_Spent__c, Wallet__c
      FROM Shop_Order__c
      WHERE Id = :shopOrder.Id
    ];
  }

  public static Integer balance(Id walletId) {
    return LedgerService.balanceOf(walletId);
  }

  /** Runs the block and returns the ShopException code it threw, or null. */
  public static String codeOf(Exception e) {
    return e instanceof ShopException ? ((ShopException) e).code : null;
  }
}
