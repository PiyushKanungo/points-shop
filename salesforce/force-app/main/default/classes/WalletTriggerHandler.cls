/**
 * Keeps wallet emails lower-case and gives every new wallet a referral code.
 */
public with sharing class WalletTriggerHandler extends TriggerHandler {
  @TestVisible
  private static final String CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  @TestVisible
  private static final Integer CODE_LENGTH = 8;

  protected override void beforeInsert() {
    for (Wallet__c wallet : (List<Wallet__c>) newList) {
      normaliseEmail(wallet);
      if (String.isBlank(wallet.Referral_Code__c)) {
        wallet.Referral_Code__c = newReferralCode();
      }
    }
  }

  protected override void beforeUpdate() {
    for (Wallet__c wallet : (List<Wallet__c>) newList) {
      normaliseEmail(wallet);
    }
  }

  private static void normaliseEmail(Wallet__c wallet) {
    if (wallet.Email__c != null) {
      wallet.Email__c = wallet.Email__c.trim().toLowerCase();
    }
  }

  /** 8 characters from an alphabet without the look-alikes O, I, L, 0 and 1. */
  public static String newReferralCode() {
    String code = '';
    for (Integer i = 0; i < CODE_LENGTH; i++) {
      Integer index = Math.mod(Math.abs(Crypto.getRandomInteger()), CODE_ALPHABET.length());
      code += CODE_ALPHABET.substring(index, index + 1);
    }
    return code;
  }
}
