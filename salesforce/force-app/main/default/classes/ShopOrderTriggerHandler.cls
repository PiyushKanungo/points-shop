/**
 * Stamps delivery and cancellation times, and refunds the points of cancelled orders once.
 */
public with sharing class ShopOrderTriggerHandler extends TriggerHandler {
  public static final String DELIVERED = 'Delivered';
  public static final String CANCELLED = 'Cancelled';

  protected override void beforeUpdate() {
    for (Shop_Order__c shopOrder : (List<Shop_Order__c>) newList) {
      Shop_Order__c old = (Shop_Order__c) oldMap.get(shopOrder.Id);
      if (shopOrder.Status__c == old.Status__c) {
        continue;
      }
      if (shopOrder.Status__c == DELIVERED && shopOrder.Delivered_At__c == null) {
        shopOrder.Delivered_At__c = System.now();
      }
      if (shopOrder.Status__c == CANCELLED && shopOrder.Cancelled_At__c == null) {
        shopOrder.Cancelled_At__c = System.now();
      }
    }
  }

  protected override void afterUpdate() {
    Map<Id, Shop_Order__c> cancelled = new Map<Id, Shop_Order__c>();
    for (Shop_Order__c shopOrder : (List<Shop_Order__c>) newList) {
      Shop_Order__c old = (Shop_Order__c) oldMap.get(shopOrder.Id);
      if (shopOrder.Status__c == CANCELLED && old.Status__c != CANCELLED) {
        cancelled.put(shopOrder.Id, shopOrder);
      }
    }
    if (cancelled.isEmpty()) {
      return;
    }

    // Refund what was actually redeemed for each order (not the editable Points_Spent__c).
    Map<Id, Integer> redeemedByOrder = new Map<Id, Integer>();
    for (AggregateResult row : [
      SELECT Shop_Order__c orderId, SUM(Amount__c) total
      FROM Points_Ledger__c
      WHERE Shop_Order__c IN :cancelled.keySet() AND Entry_Type__c = :LedgerService.REDEEM
      GROUP BY Shop_Order__c
    ]) {
      Decimal total = (Decimal) row.get('total');
      redeemedByOrder.put((Id) row.get('orderId'), total == null ? 0 : total.intValue());
    }

    List<LedgerService.Posting> refunds = new List<LedgerService.Posting>();
    for (Shop_Order__c shopOrder : cancelled.values()) {
      Integer redeemed = redeemedByOrder.get(shopOrder.Id);
      if (redeemed == null || redeemed == 0) {
        continue;
      }
      refunds.add(
        new LedgerService.Posting(
          shopOrder.Wallet__c,
          -redeemed,
          LedgerService.REFUND,
          'Refund for ' + shopOrder.Name,
          'refund:' + shopOrder.Id,
          null,
          shopOrder.Id
        )
      );
    }
    LedgerService.postAll(refunds);
  }
}
