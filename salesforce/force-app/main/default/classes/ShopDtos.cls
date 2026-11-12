/**
 * JSON shapes of the Points Shop REST API (design section 4).
 * Field names are the JSON keys, so they avoid Apex reserved words (orderNumber, entryType).
 * Response wrappers whose key would be `order` are built as maps in ShopApi.
 */
public with sharing class ShopDtos {
  // ------------------------------------------------------------------ responses

  public class OfferingDto {
    public String slug;
    public String name;
    public String description;
    public Integer pointsPrice;
    public String fulfilmentType;
    public String deliveryPromise;
    public String bookingUrl;
  }

  public class TaskDto {
    public String key;
    public String name;
    public String description;
    public Integer points;
    public String verification;
    public Integer maxPerWallet;
    public String linkUrl;
  }

  public class CatalogDto {
    public List<OfferingDto> offerings = new List<OfferingDto>();
    public List<TaskDto> tasks = new List<TaskDto>();
  }

  public class LedgerEntryDto {
    public String id;
    public Integer amount;
    public String entryType;
    public String reason;
    public Datetime createdAt;
  }

  public class WalletDto {
    public String id;
    public String email;
    public Integer balance;
    public String referralCode;
    public List<LedgerEntryDto> recentEntries = new List<LedgerEntryDto>();
    public Map<String, Integer> taskCounts = new Map<String, Integer>();
  }

  public class OrderOfferingDto {
    public String slug;
    public String name;
    public String fulfilmentType;
  }

  public class ReviewDto {
    public Integer rating;
    public String text;
  }

  public class OrderDto {
    public String id;
    public String orderNumber;
    public OrderOfferingDto offering;
    public String status;
    public Integer pointsSpent;
    public String question;
    public String resumeUrl;
    public Datetime bookingStart;
    public Datetime createdAt;
    public Datetime deliveredAt;
    public Datetime cancelledAt;
    public ReviewDto review;
  }

  public class VerifyResult {
    public WalletDto wallet;
    public Boolean isNew;
  }

  public class TaskResult {
    public Integer pointsAwarded;
    public Boolean replay;
    public Integer balance;
  }

  public class CheckoutResult {
    public List<OrderDto> orders = new List<OrderDto>();
    public Boolean replay;
    public Integer balance;
  }

  public class ReviewResult {
    public OrderDto orderDto;
    public Integer pointsAwarded;
    public Boolean replay;
    public Integer balance;
  }

  public class ErrorDetail {
    public String code;
    public String message;
  }

  public class ErrorBody {
    public ErrorDetail error = new ErrorDetail();
  }

  // ------------------------------------------------------------------ requests

  public class VerifyRequest {
    public String email;
    public Long issuedAt;
    public String referralCode;
  }

  public class TaskRequest {
    public String evidence;
  }

  public class CheckoutRequest {
    public String checkoutKey;
    public List<String> offerings;
  }

  public class DetailsRequest {
    public String question;
    public String resumeUrl;
  }

  public class BookingRequest {
    public String bookingUid;
    public Datetime bookingStart;
  }

  public class ReviewRequest {
    public Integer rating;
    public String text;
  }

  // ------------------------------------------------------------------ mapping

  public static OfferingDto toDto(Service__c s) {
    OfferingDto dto = new OfferingDto();
    dto.slug = s.Slug__c;
    dto.name = s.Name;
    dto.description = s.Description__c;
    dto.pointsPrice = toInt(s.Points_Price__c);
    dto.fulfilmentType = s.Fulfilment_Type__c;
    dto.deliveryPromise = s.Delivery_Promise__c;
    dto.bookingUrl = s.Booking_Url__c;
    return dto;
  }

  public static TaskDto toDto(Earn_Task__c t) {
    TaskDto dto = new TaskDto();
    dto.key = t.Key__c;
    dto.name = t.Name;
    dto.description = t.Description__c;
    dto.points = toInt(t.Points__c);
    dto.verification = t.Verification__c;
    dto.maxPerWallet = toInt(t.Max_Per_Wallet__c);
    dto.linkUrl = t.Link_Url__c;
    return dto;
  }

  public static LedgerEntryDto toDto(Points_Ledger__c e) {
    LedgerEntryDto dto = new LedgerEntryDto();
    dto.id = e.Id;
    dto.amount = toInt(e.Amount__c);
    dto.entryType = e.Entry_Type__c;
    dto.reason = e.Reason__c;
    dto.createdAt = e.CreatedDate;
    return dto;
  }

  /** Expects Service__r.Slug__c, Service__r.Name and Service__r.Fulfilment_Type__c to be queried. */
  public static OrderDto toDto(Shop_Order__c o) {
    OrderDto dto = new OrderDto();
    dto.id = o.Id;
    dto.orderNumber = o.Name;
    dto.offering = new OrderOfferingDto();
    dto.offering.slug = o.Service__r.Slug__c;
    dto.offering.name = o.Service__r.Name;
    dto.offering.fulfilmentType = o.Service__r.Fulfilment_Type__c;
    dto.status = o.Status__c;
    dto.pointsSpent = toInt(o.Points_Spent__c);
    dto.question = o.Question__c;
    dto.resumeUrl = o.Resume_Url__c;
    dto.bookingStart = o.Booking_Start__c;
    dto.createdAt = o.CreatedDate;
    dto.deliveredAt = o.Delivered_At__c;
    dto.cancelledAt = o.Cancelled_At__c;
    if (o.Review_Rating__c != null) {
      dto.review = new ReviewDto();
      dto.review.rating = toInt(o.Review_Rating__c);
      dto.review.text = o.Review_Text__c;
    }
    return dto;
  }

  public static ErrorBody error(String code, String message) {
    ErrorBody body = new ErrorBody();
    body.error.code = code;
    body.error.message = message;
    return body;
  }

  public static Integer toInt(Decimal value) {
    return value == null ? 0 : value.intValue();
  }
}
