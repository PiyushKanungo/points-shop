/**
 * Makes the ledger append-only: inserts must come from LedgerService, and entries can never be
 * updated or deleted one by one. (Deleting a whole wallet cascades to its entries without firing
 * this trigger; that is the delete-wallet path for privacy requests.)
 */
public with sharing class PointsLedgerTriggerHandler extends TriggerHandler {
  @TestVisible
  private static final String INSERT_ERROR = 'Ledger entries can only be created by LedgerService.';
  @TestVisible
  private static final String CHANGE_ERROR = 'Ledger entries are append-only.';

  protected override void beforeInsert() {
    if (LedgerService.isPosting) {
      return;
    }
    for (SObject entry : newList) {
      entry.addError(INSERT_ERROR);
    }
  }

  protected override void beforeUpdate() {
    for (SObject entry : newList) {
      entry.addError(CHANGE_ERROR);
    }
  }

  protected override void beforeDelete() {
    for (SObject entry : oldList) {
      entry.addError(CHANGE_ERROR);
    }
  }
}
