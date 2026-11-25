/**
 * Concierge action: the signed-in visitor's balance and recent points history.
 * The wallet comes from the chat key only.
 * Runs as the agent user, so it is without sharing and reads only the given wallet.
 */
public without sharing class ConciergeGetBalance {
  public class Input {
    @InvocableVariable(
      label='Session key'
      description='The chatKey from the current message.'
      required=true
    )
    public String sessionKey;
  }

  public class Output {
    @InvocableVariable(label='Balance' description='Points the visitor can spend now.')
    public Integer balance;
    @InvocableVariable(label='Summary' description='The latest points entries, newest first.')
    public String summary;
  }

  @InvocableMethod(
    label='Concierge: Get balance'
    description='Returns the signed-in visitor\'s points balance and their latest points entries.'
  )
  public static List<Output> run(List<Input> inputs) {
    List<Output> results = new List<Output>();
    for (Input input : inputs) {
      Output output = new Output();
      try {
        ShopDtos.WalletDto wallet = WalletService.getWallet(ConciergeService.walletFor(input.sessionKey));
        output.balance = wallet.balance;
        List<String> lines = new List<String>();
        for (Integer i = 0; i < Math.min(5, wallet.recentEntries.size()); i++) {
          ShopDtos.LedgerEntryDto entry = wallet.recentEntries[i];
          lines.add((entry.amount > 0 ? '+' : '') + entry.amount + ' ' + entry.reason);
        }
        output.summary = lines.isEmpty() ? 'No points activity yet.' : String.join(lines, '\n');
      } catch (Exception e) {
        output.balance = 0;
        output.summary = 'The wallet could not be read. Ask the visitor to refresh the page and sign in again.';
      }
      results.add(output);
    }
    return results;
  }
}