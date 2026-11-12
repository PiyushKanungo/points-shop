# Milestone 1 Agentforce test

A 1–2 hour test, run right after the org exists, that answers the open questions the concierge
design (design section 7) depends on. Fill in the results table; the milestone 5 plan follows from
it.

## Steps

1. **Enable Agentforce.** Setup → Agentforce Agents. Turn on Agentforce if it is off.
2. **Create a throwaway invocable action.** Developer Console → New Apex Class:

   ```apex
   public with sharing class SpikeEcho {
       public class Input {
           @InvocableVariable(label='Wallet ID' required=true)
           public String walletId;
       }
       public class Output {
           @InvocableVariable(label='Echo')
           public String echo;
       }
       @InvocableMethod(label='Spike Echo' description='Returns the wallet ID it was given.')
       public static List<Output> run(List<Input> inputs) {
           Output o = new Output();
           o.echo = 'Wallet seen: ' + inputs[0].walletId;
           return new List<Output>{ o };
       }
   }
   ```

   Do not commit this class.
3. **Create a test agent.** Agentforce Agents → New Agent → Agentforce Service Agent. Add one
   topic ("Spike") whose instructions say to call Spike Echo when asked "what is my wallet".
   Add Spike Echo as an action of the topic.
4. **Add a context variable.** In Agent Builder → Context (or Variables): create `WalletId`
   (Text). Map the Spike Echo input `walletId` to it and mark it as not editable by the model,
   if the option exists. Activate the agent.
5. **Call the Agent API with client credentials.** Use the External Client App from
   [setup-org.md](./setup-org.md) phase 2 (it can be created early for this test). Get a token,
   then start a session following
   [Agent API: Get Started](https://developer.salesforce.com/docs/ai/agentforce/guide/agent-api-get-started.html),
   passing `WalletId` as a session variable with a made-up value. Ask "what is my wallet" and
   check the echo shows that value. Ask it to use a different wallet ID and check it does not.
6. **Measure latency.** Send 5 messages; record the time to each full reply.
7. **Count requests.** Setup → Agentforce usage (or Einstein Usage): note how many LLM requests
   the 5 messages used.
8. **Check storage.** Setup → Storage Usage before step 5 and after step 7; note any new record
   types (sessions, transcripts) and their size.
9. **Clean up.** Deactivate and delete the test agent and the `SpikeEcho` class.

## Results

| Question | Result | Decision it drives |
| --- | --- | --- |
| Agent API callable with client credentials? | | No → concierge uses the embedded messaging widget or is dropped (Goal 6 reduced) |
| Context variable mapped to an action input, not changeable by the model? | | No → ship the fallback in design section 7 |
| LLM requests per visitor message | | Sets whether per-wallet chat limits are needed (more than ~5 per message → add them) |
| Reply latency (median / slowest of 5) | | Sets `maxDuration` on `/api/concierge` |
| Do agent sessions or transcripts use data storage? How much per session? | | Large → limit chat to one session per wallet per day |
| Do Agent API calls count against the 15,000 daily API calls? | | Yes → note the budget in design section 10 |

Date run: ______ Org edition and release: ______
