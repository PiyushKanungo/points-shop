/**
 * Concierge action: what the shop sells, the tasks the visitor can still earn points with, and
 * their balance. The wallet comes from the chat key (optional: without it the
 * action answers for a signed-out visitor).
 */
public without sharing class ConciergeGetCatalog {
  public class Input {
    @InvocableVariable(
      label='Session key'
      description='The chatKey from the current message.'
      required=false
    )
    public String sessionKey;
  }

  public class Output {
    @InvocableVariable(
      label='Offerings'
      description='One line per offering: slug, name, points and delivery promise.'
    )
    public String offerings;
    @InvocableVariable(
      label='Tasks left'
      description='Tasks the visitor can still complete, with points.'
    )
    public String tasksLeft;
    @InvocableVariable(
      label='Balance'
      description='The visitor\'s points balance (0 when not signed in).'
    )
    public Integer balance;
  }

  @InvocableMethod(
    label='Concierge: Get catalogue'
    description='Returns the offerings (with slugs for ordering), the tasks the visitor can still complete, and their balance.'
  )
  public static List<Output> run(List<Input> inputs) {
    ShopDtos.CatalogDto catalog = CatalogService.getCatalog();
    List<String> offeringLines = new List<String>();
    for (ShopDtos.OfferingDto o : catalog.offerings) {
      offeringLines.add(
        'slug=' + o.slug + ' | ' + o.name + ' | ' + o.pointsPrice + ' points | ' + o.deliveryPromise
      );
    }

    List<Output> results = new List<Output>();
    for (Input input : inputs) {
      Output output = new Output();
      output.offerings = String.join(offeringLines, '\n');
      output.balance = 0;
      Map<String, Integer> done = new Map<String, Integer>();
      Id walletId = ConciergeService.walletFor(input.sessionKey);
      if (walletId != null) {
        try {
          ShopDtos.WalletDto wallet = WalletService.getWallet(walletId);
          output.balance = wallet.balance;
          done = wallet.taskCounts;
        } catch (Exception e) {
          output.balance = 0;
        }
      }
      List<String> taskLines = new List<String>();
      for (ShopDtos.TaskDto t : catalog.tasks) {
        Integer count = done.containsKey(t.key) ? done.get(t.key) : 0;
        if (count < t.maxPerWallet && t.verification != 'System' && t.verification != 'Review') {
          taskLines.add(t.name + ' (+' + t.points + ' points)');
        }
      }
      output.tasksLeft = taskLines.isEmpty() ? 'All tasks done.' : String.join(taskLines, '\n');
      results.add(output);
    }
    return results;
  }
}