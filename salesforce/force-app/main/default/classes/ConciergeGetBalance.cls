/**
 * Concierge action: the signed-in visitor's balance and recent points history.
 * walletId is bound by the agent to a server-set session variable; the model cannot supply it.
 * Runs as the agent user, so it is without sharing and reads only the given wallet.
 */
public without sharing class ConciergeGetBalance {
  public class Input {
    @InvocableVariable(
      label='Wallet ID'
      description='Set by the server for the signed-in visitor.'
      required=true
    )
    public String walletId;
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
        ShopDtos.WalletDto wallet = WalletService.getWallet(Id.valueOf(input.walletId));
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