import { initBotId } from "botid/client/core";

// BotID attaches its signals to these requests; lib/bot-check.ts verifies them on the server.
initBotId({
  protect: [
    { path: "/api/auth/link", method: "POST" },
    { path: "/api/auth/verify", method: "POST" },
    { path: "/api/tasks/*", method: "POST" },
    { path: "/api/checkout", method: "POST" },
    { path: "/api/concierge", method: "POST" },
  ],
});
