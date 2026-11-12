/**
 * Turns a basket of offerings into orders paid with points.
 *
 * The wallet is locked before the replay check, so two identical requests at the same moment run
 * one after the other and the second returns the first one's orders. Order_Key__c
 * (walletId:checkoutKey:slug) is unique, a second guard against duplicate orders.
 */
public inherited sharing class CheckoutService {
  @TestVisible
  private static final Pattern CHECKOUT_KEY_PATTERN = Pattern.compile('^[A-Za-z0-9:_-]{8,80}$');
  @TestVisible
  private static final Integer MAX_OFFERINGS = 4;
  @TestVisible
  private static Boolean failAfterOrderInsert = false;

  public static ShopDtos.CheckoutResult checkout(
    Id walletId,
    String checkoutKey,
    List<String> slugs
  ) {
    Savepoint sp = Database.setSavepoint();
    try {
      validate(checkoutKey, slugs);
      LedgerService.lockWallets(new Set<Id>{ walletId });

      ShopDtos.CheckoutResult result = new ShopDtos.CheckoutResult();
      List<Shop_Order__c> existing = OrderService.queryOrders(
        'WHERE Wallet__c = :walletId AND Checkout_Key__c = :checkoutKey ORDER BY Name ASC',
        new Map<String, Object>{ 'walletId' => walletId, 'checkoutKey' => checkoutKey }
      );
      if (!existing.isEmpty()) {
        for (Shop_Order__c shopOrder : existing) {
          result.orders.add(ShopDtos.toDto(shopOrder));
        }
        result.replay = true;
        result.balance = LedgerService.balanceOf(walletId);
        return result;
      }

      Map<String, Service__c> offeringsBySlug = new Map<String, Service__c>();
      for (Service__c s : [
        SELECT Id, Name, Slug__c, Points_Price__c
        FROM Service__c
        WHERE Slug__c IN :slugs AND Active__c = TRUE
      ]) {
        offeringsBySlug.put(s.Slug__c, s);
      }
      Integer total = 0;
      for (String slug : slugs) {
        Service__c offering = offeringsBySlug.get(slug);
        if (offering == null) {
          throw new ShopException(ShopException.NOT_FOUND, 'Offering not found: ' + slug);
        }
        total += ShopDtos.toInt(offering.Points_Price__c);
      }
      if (LedgerService.balanceOf(walletId) < total) {
        throw new ShopException(ShopException.INSUFFICIENT_POINTS, 'Not enough points.');
      }

      List<Shop_Order__c> orders = new List<Shop_Order__c>();
      for (String slug : slugs) {
        Service__c offering = offeringsBySlug.get(slug);
        orders.add(
          new Shop_Order__c(
            Wallet__c = walletId,
            Service__c = offering.Id,
            Order_Key__c = orderKey(walletId, checkoutKey, slug),
            Checkout_Key__c = checkoutKey,
            Points_Spent__c = offering.Points_Price__c,
            Status__c = 'Awaiting Details'
          )
        );
      }
      insert orders;
      if (failAfterOrderInsert) {
        throw new ShopException(ShopException.INTERNAL, 'Forced failure');
      }

      Map<Id, Shop_Order__c> inserted = new Map<Id, Shop_Order__c>(
        [SELECT Id, Name, Order_Key__c, Points_Spent__c FROM Shop_Order__c WHERE Id IN :orders]
      );
      List<LedgerService.Posting> redeems = new List<LedgerService.Posting>();
      for (Shop_Order__c shopOrder : orders) {
        Shop_Order__c saved = inserted.get(shopOrder.Id);
        redeems.add(
          new LedgerService.Posting(
            walletId,
            -ShopDtos.toInt(saved.Points_Spent__c),
            LedgerService.REDEEM,
            'Order ' + saved.Name,
            'redeem:' + saved.Order_Key__c,
            null,
            saved.Id
          )
        );
      }
      LedgerService.postAll(redeems);

      for (
        Shop_Order__c shopOrder : OrderService.queryOrders(
          'WHERE Id IN :ids ORDER BY Name ASC',
          new Map<String, Object>{ 'ids' => inserted.keySet() }
        )
      ) {
        result.orders.add(ShopDtos.toDto(shopOrder));
      }
      result.replay = false;
      result.balance = LedgerService.balanceOf(walletId);
      return result;
    } catch (Exception e) {
      Database.rollback(sp);
      throw e;
    }
  }

  public static String orderKey(Id walletId, String checkoutKey, String slug) {
    return String.valueOf(walletId) + ':' + checkoutKey + ':' + slug;
  }

  private static void validate(String checkoutKey, List<String> slugs) {
    if (checkoutKey == null || !CHECKOUT_KEY_PATTERN.matcher(checkoutKey).matches()) {
      throw new ShopException(
        ShopException.VALIDATION,
        'checkoutKey must be 8 to 80 letters, digits, colons, hyphens or underscores.'
      );
    }
    if (slugs == null || slugs.isEmpty() || slugs.size() > MAX_OFFERINGS) {
      throw new ShopException(
        ShopException.VALIDATION,
        'Choose between 1 and ' + MAX_OFFERINGS + ' offerings.'
      );
    }
    Set<String> seen = new Set<String>();
    for (String slug : slugs) {
      if (String.isBlank(slug) || !seen.add(slug)) {
        throw new ShopException(
          ShopException.VALIDATION,
          'Each offering can appear once in a checkout.'
        );
      }
    }
  }
}
