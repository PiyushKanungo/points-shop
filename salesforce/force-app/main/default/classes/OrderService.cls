/**
 * Order reads, fulfilment input, bookings and reviews. Every method checks that the order belongs
 * to the wallet; an order of another wallet is reported as NOT_FOUND.
 */
public inherited sharing class OrderService {
  public static final String AWAITING_DETAILS = 'Awaiting Details';
  public static final String IN_PROGRESS = 'In Progress';
  public static final String DELIVERED = 'Delivered';

  @TestVisible
  private static final Integer MIN_QUESTION = 20;
  @TestVisible
  private static final Integer MAX_QUESTION = 2000;
  @TestVisible
  private static final Integer MAX_REVIEW_TEXT = 1000;

  private static final String ORDER_FIELDS =
    'SELECT Id, Name, Wallet__c, Status__c, Points_Spent__c, Question__c, Resume_Url__c, ' +
    'Booking_Uid__c, Booking_Start__c, Delivered_At__c, Cancelled_At__c, Review_Rating__c, ' +
    'Review_Text__c, CreatedDate, Order_Key__c, Checkout_Key__c, ' +
    'Service__r.Slug__c, Service__r.Name, Service__r.Fulfilment_Type__c ' +
    'FROM Shop_Order__c ';

  /** Runs an order query with the standard field list and the given WHERE/ORDER BY clause. */
  public static List<Shop_Order__c> queryOrders(String clause, Map<String, Object> binds) {
    return (List<Shop_Order__c>) Database.queryWithBinds(
      ORDER_FIELDS + clause,
      binds,
      AccessLevel.SYSTEM_MODE
    );
  }

  public static List<ShopDtos.OrderDto> listOrders(Id walletId) {
    assertWalletExists(walletId);
    List<ShopDtos.OrderDto> result = new List<ShopDtos.OrderDto>();
    for (
      Shop_Order__c shopOrder : queryOrders(
        'WHERE Wallet__c = :walletId ORDER BY CreatedDate DESC, Name DESC',
        new Map<String, Object>{ 'walletId' => walletId }
      )
    ) {
      result.add(ShopDtos.toDto(shopOrder));
    }
    return result;
  }

  public static ShopDtos.OrderDto getOrder(Id walletId, Id orderId) {
    return ShopDtos.toDto(load(walletId, orderId));
  }

  public static ShopDtos.OrderDto saveDetails(
    Id walletId,
    Id orderId,
    String question,
    String resumeUrl
  ) {
    Savepoint sp = Database.setSavepoint();
    try {
      Boolean hasQuestion = String.isNotBlank(question);
      Boolean hasResume = String.isNotBlank(resumeUrl);
      if (hasQuestion == hasResume) {
        throw new ShopException(
          ShopException.VALIDATION,
          'Send either a question or a resume URL.'
        );
      }
      LedgerService.lockWallets(new Set<Id>{ walletId });
      Shop_Order__c shopOrder = load(walletId, orderId);
      requireStatus(shopOrder, AWAITING_DETAILS);

      String fulfilmentType = shopOrder.Service__r.Fulfilment_Type__c;
      if (hasQuestion) {
        String text = question.trim();
        if (fulfilmentType != 'Question') {
          throw new ShopException(ShopException.VALIDATION, 'This order does not take a question.');
        }
        if (text.length() < MIN_QUESTION || text.length() > MAX_QUESTION) {
          throw new ShopException(
            ShopException.VALIDATION,
            'The question must be 20 to 2,000 characters.'
          );
        }
        shopOrder.Question__c = text;
      } else {
        String url = resumeUrl.trim();
        if (fulfilmentType != 'Resume') {
          throw new ShopException(ShopException.VALIDATION, 'This order does not take a resume.');
        }
        if (!url.startsWith('https://') || url.length() > 255) {
          throw new ShopException(
            ShopException.VALIDATION,
            'The resume URL must be an https URL of 255 characters or fewer.'
          );
        }
        shopOrder.Resume_Url__c = url;
      }
      shopOrder.Status__c = IN_PROGRESS;
      update shopOrder;
      return ShopDtos.toDto(load(walletId, orderId));
    } catch (Exception e) {
      Database.rollback(sp);
      throw e;
    }
  }

  /** Called only by the Cal.com webhook route. A repeat of the same booking returns the order. */
  public static ShopDtos.OrderDto saveBooking(
    Id walletId,
    Id orderId,
    String bookingUid,
    Datetime bookingStart
  ) {
    Savepoint sp = Database.setSavepoint();
    try {
      if (String.isBlank(bookingUid) || bookingUid.length() > 100 || bookingStart == null) {
        throw new ShopException(
          ShopException.VALIDATION,
          'bookingUid (up to 100 characters) and bookingStart are required.'
        );
      }
      LedgerService.lockWallets(new Set<Id>{ walletId });
      Shop_Order__c shopOrder = load(walletId, orderId);
      if (shopOrder.Service__r.Fulfilment_Type__c != 'Booking') {
        throw new ShopException(ShopException.VALIDATION, 'This order does not take a booking.');
      }
      if (shopOrder.Status__c == IN_PROGRESS && shopOrder.Booking_Uid__c == bookingUid) {
        return ShopDtos.toDto(shopOrder);
      }
      requireStatus(shopOrder, AWAITING_DETAILS);
      shopOrder.Booking_Uid__c = bookingUid;
      shopOrder.Booking_Start__c = bookingStart;
      shopOrder.Status__c = IN_PROGRESS;
      update shopOrder;
      return ShopDtos.toDto(load(walletId, orderId));
    } catch (Exception e) {
      Database.rollback(sp);
      throw e;
    }
  }

  /**
   * Saves a review on a delivered order and awards the review task, in one transaction.
   * A repeat returns replay = true. If the award fails, the review is not saved either.
   */
  public static ShopDtos.ReviewResult submitReview(
    Id walletId,
    Id orderId,
    Integer rating,
    String text
  ) {
    Savepoint sp = Database.setSavepoint();
    try {
      if (rating == null || rating < 1 || rating > 5) {
        throw new ShopException(ShopException.VALIDATION, 'Rating must be 1 to 5.');
      }
      if (text != null && text.length() > MAX_REVIEW_TEXT) {
        throw new ShopException(
          ShopException.VALIDATION,
          'Review text must be 1,000 characters or fewer.'
        );
      }
      LedgerService.lockWallets(new Set<Id>{ walletId });
      Shop_Order__c shopOrder = load(walletId, orderId);

      ShopDtos.ReviewResult result = new ShopDtos.ReviewResult();
      String key = EarnService.completionKey(walletId, 'review', String.valueOf(orderId));
      if (![SELECT Id FROM Task_Completion__c WHERE Completion_Key__c = :key].isEmpty()) {
        result.orderDto = ShopDtos.toDto(shopOrder);
        result.pointsAwarded = 0;
        result.replay = true;
        result.balance = LedgerService.balanceOf(walletId);
        return result;
      }
      requireStatus(shopOrder, DELIVERED);
      if (shopOrder.Review_Rating__c != null) {
        throw new ShopException(ShopException.INVALID_STATE, 'This order already has a review.');
      }

      shopOrder.Review_Rating__c = rating;
      shopOrder.Review_Text__c = String.isBlank(text) ? null : text.trim();
      update shopOrder;

      result.pointsAwarded = EarnService.awardSystemTask(
        walletId,
        'review',
        String.valueOf(orderId)
      );
      result.orderDto = ShopDtos.toDto(load(walletId, orderId));
      result.replay = false;
      result.balance = LedgerService.balanceOf(walletId);
      return result;
    } catch (Exception e) {
      Database.rollback(sp);
      throw e;
    }
  }

  private static Shop_Order__c load(Id walletId, Id orderId) {
    List<Shop_Order__c> orders = queryOrders(
      'WHERE Id = :orderId AND Wallet__c = :walletId LIMIT 1',
      new Map<String, Object>{ 'orderId' => orderId, 'walletId' => walletId }
    );
    if (orders.isEmpty()) {
      throw new ShopException(ShopException.NOT_FOUND, 'Order not found.');
    }
    return orders[0];
  }

  private static void requireStatus(Shop_Order__c shopOrder, String status) {
    if (shopOrder.Status__c != status) {
      throw new ShopException(
        ShopException.INVALID_STATE,
        'This order is ' + shopOrder.Status__c + ', not ' + status + '.'
      );
    }
  }

  private static void assertWalletExists(Id walletId) {
    if ([SELECT COUNT() FROM Wallet__c WHERE Id = :walletId] == 0) {
      throw new ShopException(ShopException.NOT_FOUND, 'Wallet not found.');
    }
  }
}
