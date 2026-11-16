@IsTest
private class WalletServiceRaceTest {
  @TestSetup
  static void setup() {
    TestDataFactory.createCatalog();
  }

  @IsTest
  static void duplicateEmailReturnsTheExistingWallet() {
    // Simulates a second request inserting the same email at the same moment.
    Wallet__c first = new Wallet__c(Email__c = 'race@example.com');
    insert first;
    Wallet__c result = WalletService.insertWallet('race@example.com', 1762900000000L);
    Assert.areEqual(first.Id, result.Id);
    Assert.isFalse(WalletService.insertedHere, 'Not created by this request');
    Assert.areEqual(1, [SELECT COUNT() FROM Wallet__c]);
  }

  @IsTest
  static void referralCodeClashIsRetriedWithANewCode() {
    insert new Wallet__c(Email__c = 'holder@example.com', Referral_Code__c = 'AAAA2222');
    WalletService.firstReferralCodeForTest = 'AAAA2222';
    Wallet__c result = WalletService.insertWallet('newcomer@example.com', 1762900000000L);
    Assert.isNotNull(result.Id);
    Assert.isTrue(WalletService.insertedHere);
    String code = [SELECT Referral_Code__c FROM Wallet__c WHERE Id = :result.Id].Referral_Code__c;
    Assert.areNotEqual('AAAA2222', code);
    Assert.areEqual(8, code.length());
  }

  @IsTest
  static void nonDuplicateErrorsAreRethrown() {
    try {
      WalletService.insertWallet(null, 1762900000000L);
      Assert.fail('Expected a required-field error');
    } catch (DmlException e) {
      Assert.areNotEqual(StatusCode.DUPLICATE_VALUE, e.getDmlType(0));
    }
  }
}
