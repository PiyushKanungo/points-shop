/**
 * Runs the Agentforce concierge for a signed-in visitor. Each chat has a random key stored on the
 * wallet. The key travels with every message and is the only identity the agent's actions accept,
 * so neither the visitor nor the model can name another wallet.
 */
public without sharing class ConciergeService {
  public static final Integer DAILY_LIMIT = 40;
  public static final Integer MAX_MESSAGE = 500;
  private static final String AGENT = 'Points_Shop_Concierge';

  @TestVisible
  private static String replyForTest;

  public class StartResult {
    public String chatKey;
  }

  public class MessageResult {
    public String reply;
    public String sessionId;
  }

  /** Gives the wallet a new chat key; the previous chat's key stops working. */
  public static StartResult start(Id walletId) {
    load(walletId);
    StartResult result = new StartResult();
    result.chatKey = EncodingUtil.convertToHex(Crypto.generateAesKey(128));
    update new Wallet__c(Id = walletId, Chat_Key__c = result.chatKey);
    return result;
  }

  public static MessageResult send(Id walletId, String chatKey, String sessionId, String text) {
    String message = text == null ? '' : text.trim();
    if (message == '' || message.length() > MAX_MESSAGE) {
      throw new ShopException(ShopException.VALIDATION, 'Messages must be 1 to 500 characters.');
    }
    Wallet__c wallet = load(walletId);
    if (String.isBlank(chatKey) || wallet.Chat_Key__c == null || !wallet.Chat_Key__c.equals(chatKey)) {
      throw new ShopException(ShopException.INVALID_STATE, 'This chat has ended. Start a new one.');
    }
    Boolean sameDay = wallet.Chat_Day__c == Date.today();
    Integer used = sameDay ? ShopDtos.toInt(wallet.Chat_Count__c) : 0;
    if (used >= DAILY_LIMIT) {
      throw new ShopException(
        ShopException.INVALID_STATE,
        'You have reached today\'s chat limit. The concierge is back tomorrow.'
      );
    }
    MessageResult result = ask('[chatKey=' + chatKey + ']\n' + message, sessionId);
    update new Wallet__c(Id = walletId, Chat_Day__c = Date.today(), Chat_Count__c = used + 1);
    return result;
  }

  /** The wallet a chat key belongs to, or null. */
  public static Id walletFor(String chatKey) {
    if (String.isBlank(chatKey) || chatKey.length() != 32) {
      return null;
    }
    for (Wallet__c wallet : [SELECT Id FROM Wallet__c WHERE Chat_Key__c = :chatKey LIMIT 1]) {
      return wallet.Id;
    }
    return null;
  }

  private static MessageResult ask(String message, String sessionId) {
    MessageResult result = new MessageResult();
    if (Test.isRunningTest()) {
      result.reply = replyForTest;
      result.sessionId = sessionId == null ? 'test-session' : sessionId;
      return result;
    }
    Invocable.Action action = Invocable.Action.createCustomAction('generateAiAgentResponse', AGENT);
    action.setInvocationParameter('userMessage', message);
    if (String.isNotBlank(sessionId)) {
      action.setInvocationParameter('sessionId', sessionId);
    }
    Invocable.Action.Result response = action.invoke()[0];
    if (!response.isSuccess()) {
      throw new ShopException(ShopException.INTERNAL, 'Agent failed: ' + response.getErrors());
    }
    result.sessionId = (String) response.getOutputParameters().get('sessionId');
    result.reply = textOf((String) response.getOutputParameters().get('agentResponse'));
    return result;
  }

  @TestVisible
  private static String textOf(String agentResponse) {
    try {
      Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(agentResponse);
      return (String) parsed.get('value');
    } catch (Exception e) {
      return agentResponse;
    }
  }

  private static Wallet__c load(Id walletId) {
    List<Wallet__c> wallets = [
      SELECT Id, Chat_Key__c, Chat_Day__c, Chat_Count__c
      FROM Wallet__c
      WHERE Id = :walletId
    ];
    if (wallets.isEmpty()) {
      throw new ShopException(ShopException.NOT_FOUND, 'Wallet not found.');
    }
    return wallets[0];
  }
}
