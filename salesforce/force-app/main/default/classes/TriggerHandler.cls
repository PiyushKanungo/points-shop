/**
 * Base class for every Points Shop trigger handler. Each trigger calls `new <Handler>().run()`,
 * which dispatches to the overridden method for the current operation.
 * Handlers can be bypassed by name (used by the delete-wallet script and by tests).
 */
public virtual class TriggerHandler {
  private static Set<String> bypassedHandlers = new Set<String>();

  @TestVisible
  private System.TriggerOperation testOperation;
  @TestVisible
  private Boolean testIsExecuting;

  @TestVisible
  protected List<SObject> newList;
  @TestVisible
  protected List<SObject> oldList;
  @TestVisible
  protected Map<Id, SObject> oldMap;

  public void run() {
    Boolean executing = testIsExecuting != null ? testIsExecuting : Trigger.isExecuting;
    if (!executing || isBypassed(getHandlerName())) {
      return;
    }
    if (Trigger.isExecuting) {
      newList = Trigger.new;
      oldList = Trigger.old;
      oldMap = Trigger.oldMap;
    }
    System.TriggerOperation operation = testOperation != null
      ? testOperation
      : Trigger.operationType;
    switch on operation {
      when BEFORE_INSERT {
        beforeInsert();
      }
      when BEFORE_UPDATE {
        beforeUpdate();
      }
      when BEFORE_DELETE {
        beforeDelete();
      }
      when AFTER_INSERT {
        afterInsert();
      }
      when AFTER_UPDATE {
        afterUpdate();
      }
      when AFTER_DELETE {
        afterDelete();
      }
      when AFTER_UNDELETE {
        afterUndelete();
      }
    }
  }

  public static void bypass(String handlerName) {
    bypassedHandlers.add(handlerName);
  }

  public static void clearBypass(String handlerName) {
    bypassedHandlers.remove(handlerName);
  }

  public static Boolean isBypassed(String handlerName) {
    return bypassedHandlers.contains(handlerName);
  }

  @TestVisible
  private String getHandlerName() {
    String description = String.valueOf(this);
    String className = description.substringBefore(':');
    return className.contains('.') ? className.substringAfterLast('.') : className;
  }

  protected virtual void beforeInsert() {
  }
  protected virtual void beforeUpdate() {
  }
  protected virtual void beforeDelete() {
  }
  protected virtual void afterInsert() {
  }
  protected virtual void afterUpdate() {
  }
  protected virtual void afterDelete() {
  }
  protected virtual void afterUndelete() {
  }
}
