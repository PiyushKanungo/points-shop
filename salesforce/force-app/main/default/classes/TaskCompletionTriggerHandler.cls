/**
 * Task completions are history: they can be created but not changed or deleted
 * (except by the delete-wallet script, which bypasses this handler).
 */
public with sharing class TaskCompletionTriggerHandler extends TriggerHandler {
  @TestVisible
  private static final String CHANGE_ERROR = 'Task completions are history.';

  protected override void beforeUpdate() {
    for (SObject completion : newList) {
      completion.addError(CHANGE_ERROR);
    }
  }

  protected override void beforeDelete() {
    for (SObject completion : oldList) {
      completion.addError(CHANGE_ERROR);
    }
  }
}
