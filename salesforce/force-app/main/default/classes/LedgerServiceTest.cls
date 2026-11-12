@IsTest
private class LedgerServiceTest {
  private static LedgerService.Posting earn(Id walletId, Integer amount, String key) {
    return new LedgerService.Posting(walletId, amount, LedgerService.EARN, 'Test', key, null, null);
  }

  @IsTest
  static void postAddsToBalance() {
    Wallet__c wallet = TestDataFactory.createWallet('ledger@example.com', 0);
    LedgerService.post(earn(wallet.Id, 50, 'k1'));
    Assert.areEqual(50, TestDataFactory.balance(wallet.Id));
  }

  @IsTest
  static void sameKeyTwicePostsOnce() {
    Wallet__c wallet = TestDataFactory.createWallet('ledger@example.com', 0);
    Points_Ledger__c first = LedgerService.post(earn(wallet.Id, 50, 'k1'));
    Points_Ledger__c second = LedgerService.post(earn(wallet.Id, 50, 'k1'));
    Assert.areEqual(first.Id, second.Id, 'The second call returns the first entry');
    Assert.areEqual(1, [SELECT COUNT() FROM Points_Ledger__c WHERE Wallet__c = :wallet.Id]);
    Assert.areEqual(50, TestDataFactory.balance(wallet.Id));
  }

  @IsTest
  static void debitBeyondBalanceFails() {
    Wallet__c wallet = TestDataFactory.createWallet('ledger@example.com', 50);
    try {
      LedgerService.post(
        new LedgerService.Posting(
          wallet.Id,
          -51,
          LedgerService.REDEEM,
          'Too much',
          'k2',
          null,
          null
        )
      );
      Assert.fail('Expected INSUFFICIENT_POINTS');
    } catch (ShopException e) {
      Assert.areEqual(ShopException.INSUFFICIENT_POINTS, e.code);
    }
    Assert.areEqual(50, TestDataFactory.balance(wallet.Id));
    Assert.isFalse(LedgerService.isPosting, 'Flag is reset after a failure');
  }

  @IsTest
  static void directInsertIsRejected() {
    Wallet__c wallet = TestDataFactory.createWallet('ledger@example.com', 0);
    try {
      insert new Points_Ledger__c(
        Wallet__c = wallet.Id,
        Amount__c = 10,
        Entry_Type__c = LedgerService.EARN,
        Idempotency_Key__c = 'direct'
      );
      Assert.fail('Expected a DML error');
    } catch (DmlException e) {
      Assert.isTrue(e.getMessage().contains(PointsLedgerTriggerHandler.INSERT_ERROR));
    }
  }

  @IsTest
  static void updateAndDeleteAreRejected() {
    Wallet__c wallet = TestDataFactory.createWallet('ledger@example.com', 0);
    Points_Ledger__c entry = LedgerService.post(earn(wallet.Id, 50, 'k1'));
    entry.Amount__c = 5000;
    try {
      update entry;
      Assert.fail('Expected update to fail');
    } catch (DmlException e) {
      Assert.isTrue(e.getMessage().contains(PointsLedgerTriggerHandler.CHANGE_ERROR));
    }
    try {
      delete entry;
      Assert.fail('Expected delete to fail');
    } catch (DmlException e) {
      Assert.isTrue(e.getMessage().contains(PointsLedgerTriggerHandler.CHANGE_ERROR));
    }
    Assert.areEqual(50, TestDataFactory.balance(wallet.Id));
  }

  @IsTest
  static void wrongSignForTypeIsRejected() {
    Wallet__c wallet = TestDataFactory.createWallet('ledger@example.com', 100);
    try {
      LedgerService.post(
        new LedgerService.Posting(
          wallet.Id,
          10,
          LedgerService.REDEEM,
          'Wrong sign',
          'k3',
          null,
          null
        )
      );
      Assert.fail('Expected a validation error');
    } catch (DmlException e) {
      Assert.isTrue(e.getMessage().contains('Redeem entries negative'));
    }
  }

  @IsTest
  static void invalidPostingIsRejected() {
    Wallet__c wallet = TestDataFactory.createWallet('ledger@example.com', 0);
    try {
      LedgerService.post(earn(wallet.Id, 0, 'zero'));
      Assert.fail('Expected VALIDATION');
    } catch (ShopException e) {
      Assert.areEqual(ShopException.VALIDATION, e.code);
    }
  }

  @IsTest
  static void unknownWalletIsNotFound() {
    Wallet__c wallet = TestDataFactory.createWallet('gone@example.com', 0);
    Id walletId = wallet.Id;
    delete wallet;
    try {
      LedgerService.post(earn(walletId, 10, 'k4'));
      Assert.fail('Expected NOT_FOUND');
    } catch (ShopException e) {
      Assert.areEqual(ShopException.NOT_FOUND, e.code);
    }
  }

  @IsTest
  static void bulkPostingStaysWithinFixedLimits() {
    List<Wallet__c> wallets = new List<Wallet__c>();
    for (Integer i = 0; i < 20; i++) {
      wallets.add(new Wallet__c(Email__c = 'bulk' + i + '@example.com'));
    }
    insert wallets;
    List<LedgerService.Posting> postings = new List<LedgerService.Posting>();
    for (Wallet__c wallet : wallets) {
      for (Integer j = 0; j < 10; j++) {
        postings.add(earn(wallet.Id, 5, 'bulk:' + wallet.Id + ':' + j));
      }
    }

    Test.startTest();
    Integer queriesBefore = Limits.getQueries();
    Integer dmlBefore = Limits.getDmlStatements();
    List<Points_Ledger__c> entries = LedgerService.postAll(postings);
    Integer queriesUsed = Limits.getQueries() - queriesBefore;
    Integer dmlUsed = Limits.getDmlStatements() - dmlBefore;
    Test.stopTest();

    Assert.areEqual(200, entries.size());
    Assert.isTrue(queriesUsed <= 5, 'Queries used: ' + queriesUsed);
    Assert.isTrue(dmlUsed <= 3, 'DML statements used: ' + dmlUsed);
    for (Wallet__c wallet : [SELECT Balance__c FROM Wallet__c WHERE Id IN :wallets]) {
      Assert.areEqual(50, wallet.Balance__c);
    }
  }
}
