/**
 * Called by the Order Delivered and Order Cancelled Flows. Pings the storefront with the order's ID
 * after the transaction commits; the storefront claims the notice and emails the visitor. The ping
 * carries no secret: the claim only succeeds for an order whose email is due, and only once.
 */
public without sharing class OrderNotifier implements Queueable, Database.AllowsCallouts {
  private static final Integer MAX_ATTEMPTS = 3;
  private final Id orderId;
  private final Integer attempt;

  public OrderNotifier(Id orderId, Integer attempt) {
    this.orderId = orderId;
    this.attempt = attempt;
  }

  @InvocableMethod(label='Notify visitor about order' description='Emails the visitor about a delivered or cancelled order.')
  public static void notify(List<Id> orderIds) {
    for (Id orderId : orderIds) {
      System.enqueueJob(new OrderNotifier(orderId, 1));
    }
  }

  public void execute(QueueableContext context) {
    String problem;
    try {
      HttpRequest request = new HttpRequest();
      request.setEndpoint(System.Label.Shop_Storefront_Url + '/api/webhooks/order-status');
      request.setMethod('POST');
      request.setHeader('Content-Type', 'application/json');
      request.setTimeout(30000);
      request.setBody(JSON.serialize(new Map<String, Object>{ 'orderId' => orderId }));
      HttpResponse response = new Http().send(request);
      if (response.getStatusCode() == 200) {
        return;
      }
      problem = 'HTTP ' + response.getStatusCode();
    } catch (Exception e) {
      problem = e.getMessage();
    }
    if (attempt < MAX_ATTEMPTS && !Test.isRunningTest()) {
      System.enqueueJob(new OrderNotifier(orderId, attempt + 1), 1);
      return;
    }
    Shop_Order__c shopOrder = [SELECT Name, Service__r.OwnerId FROM Shop_Order__c WHERE Id = :orderId];
    insert new Task(
      OwnerId = shopOrder.Service__r.OwnerId,
      Priority = 'High',
      ActivityDate = Date.today(),
      Subject = 'Email the visitor of ' + shopOrder.Name + ' yourself',
      Description = problem
    );
  }

  public class Claim {
    public Boolean due = false;
    public String email;
    public ShopDtos.OrderDto shopOrder;
  }

  /** Marks the order's current status as notified, unless it already was. */
  public static Claim claim(Id orderId) {
    Claim result = new Claim();
    List<Shop_Order__c> orders = [
      SELECT Id, Status__c, Notified_Status__c, Wallet__c, Wallet__r.Email__c
      FROM Shop_Order__c
      WHERE Id = :orderId
      FOR UPDATE
    ];
    if (
      orders.isEmpty() ||
      !new Set<String>{ 'Delivered', 'Cancelled' }.contains(orders[0].Status__c) ||
      orders[0].Notified_Status__c == orders[0].Status__c
    ) {
      return result;
    }
    update new Shop_Order__c(Id = orderId, Notified_Status__c = orders[0].Status__c);
    result.due = true;
    result.email = orders[0].Wallet__r.Email__c;
    result.shopOrder = OrderService.getOrder(orders[0].Wallet__c, orderId);
    return result;
  }

  /** Makes the notice due again after the storefront failed to send it. */
  public static void release(Id orderId) {
    update new Shop_Order__c(Id = orderId, Notified_Status__c = null);
  }
}
