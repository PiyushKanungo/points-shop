@IsTest
private class CatalogServiceTest {
  @TestSetup
  static void setup() {
    TestDataFactory.createCatalog();
  }

  @IsTest
  static void returnsActiveRowsInSortOrder() {
    Service__c resume = [SELECT Id FROM Service__c WHERE Slug__c = 'resume-review'];
    resume.Active__c = false;
    update resume;
    Earn_Task__c hi = [SELECT Id FROM Earn_Task__c WHERE Key__c = 'linkedin-hi'];
    hi.Active__c = false;
    update hi;

    ShopDtos.CatalogDto catalog = CatalogService.getCatalog();

    List<String> slugs = new List<String>();
    for (ShopDtos.OfferingDto o : catalog.offerings) {
      slugs.add(o.slug);
    }
    Assert.areEqual(
      new List<String>{ 'ask-sfcc-question', 'career-chat', 'mock-interview' },
      slugs
    );
    Assert.areEqual(7, catalog.tasks.size());
    Assert.areEqual('signup', catalog.tasks[0].key);
    Assert.areEqual(100, catalog.offerings[0].pointsPrice);
    Assert.areEqual('https://cal.com/test/chat', catalog.offerings[1].bookingUrl);
    Assert.areEqual(5, catalog.tasks[5].maxPerWallet, 'referral cap');
  }
}
