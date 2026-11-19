// src/server.js
// Build 3 Step 4 — thin server bootstrap.
//
// Keeps server startup separate from the HTTP application so that the app
// can be imported and tested without binding a port.

import { createServer } from "node:http";
import { createApp } from "./http/app.js";
import { Router } from "./http/router.js";
import { PORT } from "./config.js";

const router = new Router();
const handler = createApp(router);

const server = createServer(handler);

server.on("error", (error) => {
  console.error("server failed to start:", error.message);
  process.exitCode = 1;
});

server.listen(PORT, () => {
  // Keep startup output minimal and intentional.
  console.log(`listening on http://localhost:${PORT}`);
});
