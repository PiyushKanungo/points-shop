/**
 * Sends the storefront's emails from Salesforce when no email provider is configured.
 * Owner emails go to the user who owns the offerings.
 */
public without sharing class ShopEmailService {
  @TestVisible
  private static Boolean lastSent = false;

  public class Request {
    public String to;
    public String subject;
    public String html;
    public Boolean toOwner;
  }

  public static void send(Request request) {
    Boolean toOwner = request.toOwner == true;
    String address = toOwner ? ownerEmail() : request.to;
    if (
      String.isBlank(address) ||
      !Pattern.matches('^[^@\\s,;]+@[^@\\s,;]+\\.[^@\\s,;]+$', address) ||
      String.isBlank(request.subject) ||
      String.isBlank(request.html)
    ) {
      throw new ShopException(ShopException.VALIDATION, 'A single address, subject and body are required.');
    }
    lastSent = true;
    Flow.Interview.createInterview(
        'Send_Shop_Email',
        new Map<String, Object>{
          'toAddress' => address,
          'subject' => request.subject.left(200),
          'body' => request.html
        }
      )
      .start();
  }

  private static String ownerEmail() {
    List<Service__c> offerings = [SELECT OwnerId FROM Service__c WHERE Active__c = TRUE LIMIT 1];
    if (offerings.isEmpty()) {
      return null;
    }
    List<User> users = [SELECT Email FROM User WHERE Id = :offerings[0].OwnerId];
    return users.isEmpty() ? null : users[0].Email;
  }
}
