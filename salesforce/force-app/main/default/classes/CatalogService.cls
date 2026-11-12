/**
 * Active offerings and earn tasks, sorted for display.
 */
public inherited sharing class CatalogService {
  public static ShopDtos.CatalogDto getCatalog() {
    ShopDtos.CatalogDto catalog = new ShopDtos.CatalogDto();
    for (Service__c s : [
      SELECT
        Name,
        Slug__c,
        Description__c,
        Points_Price__c,
        Fulfilment_Type__c,
        Delivery_Promise__c,
        Booking_Url__c
      FROM Service__c
      WHERE Active__c = TRUE
      ORDER BY Sort_Order__c ASC NULLS LAST, Name ASC
    ]) {
      catalog.offerings.add(ShopDtos.toDto(s));
    }
    for (Earn_Task__c t : [
      SELECT
        Name,
        Key__c,
        Description__c,
        Points__c,
        Verification__c,
        Max_Per_Wallet__c,
        Link_Url__c
      FROM Earn_Task__c
      WHERE Active__c = TRUE
      ORDER BY Sort_Order__c ASC NULLS LAST, Name ASC
    ]) {
      catalog.tasks.add(ShopDtos.toDto(t));
    }
    return catalog;
  }
}
