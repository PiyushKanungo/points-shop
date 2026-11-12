@IsTest
private class TriggerHandlerTest {
  private class CountingHandler extends TriggerHandler {
    public List<String> calls = new List<String>();
    protected override void beforeInsert() {
      calls.add('beforeInsert');
    }
    protected override void beforeUpdate() {
      calls.add('beforeUpdate');
    }
    protected override void beforeDelete() {
      calls.add('beforeDelete');
    }
    protected override void afterInsert() {
      calls.add('afterInsert');
    }
    protected override void afterUpdate() {
      calls.add('afterUpdate');
    }
    protected override void afterDelete() {
      calls.add('afterDelete');
    }
    protected override void afterUndelete() {
      calls.add('afterUndelete');
    }
  }

  private static List<String> runFor(System.TriggerOperation operation) {
    CountingHandler counting = new CountingHandler();
    TriggerHandler handler = counting;
    handler.testIsExecuting = true;
    handler.testOperation = operation;
    handler.run();
    return counting.calls;
  }

  @IsTest
  static void dispatchesEachOperation() {
    Map<System.TriggerOperation, String> expected = new Map<System.TriggerOperation, String>{
      System.TriggerOperation.BEFORE_INSERT => 'beforeInsert',
      System.TriggerOperation.BEFORE_UPDATE => 'beforeUpdate',
      System.TriggerOperation.BEFORE_DELETE => 'beforeDelete',
      System.TriggerOperation.AFTER_INSERT => 'afterInsert',
      System.TriggerOperation.AFTER_UPDATE => 'afterUpdate',
      System.TriggerOperation.AFTER_DELETE => 'afterDelete',
      System.TriggerOperation.AFTER_UNDELETE => 'afterUndelete'
    };
    for (System.TriggerOperation operation : expected.keySet()) {
      Assert.areEqual(
        new List<String>{ expected.get(operation) },
        runFor(operation),
        'Wrong dispatch for ' + operation
      );
    }
  }

  @IsTest
  static void bypassStopsDispatch() {
    TriggerHandler.bypass('CountingHandler');
    Assert.isTrue(TriggerHandler.isBypassed('CountingHandler'));
    Assert.areEqual(0, runFor(System.TriggerOperation.BEFORE_INSERT).size());

    TriggerHandler.clearBypass('CountingHandler');
    Assert.areEqual(1, runFor(System.TriggerOperation.BEFORE_INSERT).size());
  }

  @IsTest
  static void doesNothingOutsideATrigger() {
    CountingHandler counting = new CountingHandler();
    counting.run();
    Assert.areEqual(0, counting.calls.size());
  }

  @IsTest
  static void handlerNameIsTheClassName() {
    TriggerHandler handler = new CountingHandler();
    Assert.areEqual('CountingHandler', handler.getHandlerName());
  }
}
