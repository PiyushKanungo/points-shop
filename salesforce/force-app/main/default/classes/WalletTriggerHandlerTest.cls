@IsTest
private class WalletTriggerHandlerTest {
  @IsTest
  static void emailIsStoredLowerCase() {
    Wallet__c wallet = new Wallet__c(Email__c = '  Mixed.Case@Example.COM ');
    insert wallet;
    Assert.areEqual(
      'mixed.case@example.com',
      [SELECT Email__c FROM Wallet__c WHERE Id = :wallet.Id].Email__c
    );

    wallet.Email__c = 'Changed@Example.com';
    update wallet;
    Assert.areEqual(
      'changed@example.com',
      [SELECT Email__c FROM Wallet__c WHERE Id = :wallet.Id].Email__c
    );
  }

  @IsTest
  static void referralCodeIsGenerated() {
    Wallet__c wallet = new Wallet__c(Email__c = 'code@example.com');
    insert wallet;
    String code = [SELECT Referral_Code__c FROM Wallet__c WHERE Id = :wallet.Id].Referral_Code__c;
    Assert.areEqual(WalletTriggerHandler.CODE_LENGTH, code.length());
    for (Integer i = 0; i < code.length(); i++) {
      Assert.isTrue(
        WalletTriggerHandler.CODE_ALPHABET.contains(code.substring(i, i + 1)),
        'Unexpected character in ' + code
      );
    }
  }

  @IsTest
  static void duplicateEmailInAnyCaseIsRejected() {
    insert new Wallet__c(Email__c = 'dup@example.com');
    try {
      insert new Wallet__c(Email__c = 'DUP@example.com');
      Assert.fail('Expected a duplicate error');
    } catch (DmlException e) {
      Assert.areEqual(StatusCode.DUPLICATE_VALUE, e.getDmlType(0));
    }
  }
}
