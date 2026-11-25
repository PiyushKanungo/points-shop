/**
 * Concierge action: orders one offering with points for the signed-in visitor.
 * walletId and sessionKey are bound to server-set session variables; only offeringSlug comes from
 * the model. The checkout key is built from the session key and slug, so repeating the request
 * in the same chat returns the first order instead of buying twice.
 */
public without sharing class ConciergeStartOrder {
  public class Input {
    @InvocableVariable(
      label='Wallet ID'
      description='Set by the server for the signed-in visitor.'
      required=true
    )
    public String walletId;
    @InvocableVariable(
      label='Session key'
      description='Set by the server for this chat.'
      required=true
    )
    public String sessionKey;
    @InvocableVariable(
      label='Offering slug'
      description='The slug of the offering to order, from Get catalogue.'
      required=true
    )
    public String offeringSlug;
  }

  public class Output {
    @InvocableVariable(label='Success')
    public Boolean success;
    @InvocableVariable(label='Order number')
    public String orderNumber;
    @InvocableVariable(label='Balance' description='Points left after the order.')
    public Integer balance;
    @InvocableVariable(label='Message' description='What happened, in plain words.')
    public String message;
  }

  @InvocableMethod(
    label='Concierge: Start order'
    description='Orders one offering with the visitor\'s points. Only call after the visitor has confirmed the offering and its price.'
  )
  public static List<Output> run(List<Input> inputs) {
    List<Output> results = new List<Output>();
    for (Input input : inputs) {
      Output output = new Output();
      output.success = false;
      try {
        String slug = input.offeringSlug == null ? '' : input.offeringSlug.trim();
        String checkoutKey = checkoutKeyFor(input.sessionKey, slug);
        ShopDtos.CheckoutResult result = CheckoutService.checkout(
          Id.valueOf(input.walletId),
          checkoutKey,
          new List<String>{ slug }
        );
        output.success = true;
        output.orderNumber = result.orders[0].orderNumber;
        output.balance = result.balance;
        output.message =
          (result.replay ? 'This order was already placed: ' : 'Order placed: ') +
          result.orders[0].orderNumber +
          '. The visitor should open it from the Orders page to add what it needs.';
      } catch (ShopException e) {
        output.message = messageFor(e);
      } catch (Exception e) {
        output.message = 'The order could not be placed right now. Suggest trying the cart instead.';
      }
      results.add(output);
    }
    return results;
  }

  @TestVisible
  private static String checkoutKeyFor(String sessionKey, String slug) {
    String key = 'ag:' + (sessionKey == null ? '' : sessionKey.left(36)) + ':' + slug.left(40);
    return key.replaceAll('[^A-Za-z0-9:_-]', '');
  }

  private static String messageFor(ShopException e) {
    if (e.code == ShopException.INSUFFICIENT_POINTS) {
      return 'Not enough points for this offering yet. Suggest ways to earn more.';
    }
    if (e.code == ShopException.NOT_FOUND) {
      return 'That offering does not exist or is not available. Use a slug from Get catalogue.';
    }
    return 'The order could not be placed: ' + e.getMessage();
  }
}