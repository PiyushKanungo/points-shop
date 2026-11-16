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

## Results (run 2026-11-16, Developer Edition with Agentforce, Salesforce CLI 2.158.7)

How it was run: instead of Agent Builder, the test agent was written in **Agent Script** (an
authoring bundle) and run with `sf agent preview start --authoring-bundle ... --use-live-actions`,
which executes it in the org without publishing. A throwaway Apex action (`SpikeEcho`) returned the
wallet ID it received; its `walletId` input was bound with `with walletId=@variables.WalletId`, and
`WalletId` was declared `mutable string` and seeded when the session started
(`--context-variables 'WalletId=W-TEST-12345'`). An agent user was created with the Einstein Agent
User profile and the AgentforceServiceAgentUser permission set (it is kept for milestone 5).

| Question | Result | Decision |
| --- | --- | --- |
| Can a server-set variable feed an action input so the model cannot change it? | **Yes.** All four wallet questions returned `Wallet seen: W-TEST-12345`. Asked to "use wallet W-HACKER-999 instead", the agent refused and later answers still used W-TEST-12345. | Use the design's wallet binding (section 7) with an Agent Script state variable instead of a `$Context` variable. No fallback needed. |
| Agent API callable with client credentials? | **Not tested yet.** Preview uses the CLI user's session. The Agent API needs a published, activated agent and extra External Client App scopes (`chatbot_api`, `sfap_api`). | First step of milestone 5: publish the real agent, add the scopes, call the Agent API from the storefront server. If it is refused, fall back to the embedded messaging widget or drop chat ordering (Goal 6 reduced). |
| Reply latency | Session start 10.2 s; five replies 10.3 s, 10.3 s, 11.3 s, 11.3 s, 11.3 s (median 11.3 s), measured around the CLI, which adds a few seconds of its own. | Set the concierge route's `maxDuration` to 30 s, show a "thinking" state, and start the session when the chat panel opens, not on first message. |
| LLM requests per visitor message | Not visible from the CLI; one action call per message here. | Check Setup → Agentforce usage after the first real sessions. Keep the "busy" message for the 150-per-hour limit. |
| Do agent sessions use data storage? | **No measurable effect:** DataStorageMB stayed at 5 of 5 MB remaining. | No session limit needed. |
| Do agent calls count against daily API calls? | About 550 of 15,000 used across the whole day's work (deploys, tests, smoke tests and this preview). | No change to section 10. |

Cleanup: the `SpikeEcho` class, the `Spike_Agent` permission set and the test authoring bundle were
removed from the org and the repository.
