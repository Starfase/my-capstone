// test/http.test.js
// Build 3 Step 4 — HTTP tests for the router and app.

import assert from "node:assert";
import { test } from "node:test";
import { createServer, request as httpRequest } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Router } from "../src/http/router.js";
import { createApp } from "../src/http/app.js";

// ---------------------------------------------------------------------------
// Router tests
// ---------------------------------------------------------------------------

test("router matches method and path", () => {
  const router = new Router();
  router.add("GET", "/health", () => "ok");

  const match = router.findRoute("GET", "/health");
  assert.ok(match);
  assert.deepStrictEqual(match.params, {});
});

test("router rejects the wrong method", () => {
  const router = new Router();
  router.add("GET", "/health", () => "ok");

  const match = router.findRoute("POST", "/health");
  assert.strictEqual(match, null);
});

test("router captures one :param", () => {
  const router = new Router();
  router.add("GET", "/api/events/:id", (req, params) => params);

  const match = router.findRoute("GET", "/api/events/42");
  assert.ok(match);
  assert.strictEqual(match.params.id, "42");
});

test("router captures multiple parameters", () => {
  const router = new Router();
  router.add(
    "GET",
    "/api/bookings/:bookingId/items/:itemId",
    (req, params) => params,
  );

  const match = router.findRoute("GET", "/api/bookings/b-1/items/i-2");
  assert.ok(match);
  assert.strictEqual(match.params.bookingId, "b-1");
  assert.strictEqual(match.params.itemId, "i-2");
});

// ---------------------------------------------------------------------------
// HTTP integration tests
// ---------------------------------------------------------------------------

async function startServer(handler) {
  const server = createServer(handler);

  await new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, () => resolve(server));
  });

  return server;
}

function baseUrl(server) {
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

test("real HTTP GET /health returns status 200 and { status: 'ok' }", async () => {
  const router = new Router();
  const app = createApp(router);

  const server = await startServer(app);
  try {
    const response = await fetch(baseUrl(server) + "/health");
    const responseText = await response.text();
    const body = responseText ? JSON.parse(responseText) : null;

    assert.strictEqual(response.status, 200);
    assert.ok(
      response.headers.get("content-type").includes("application/json"),
      "expected a JSON content-type",
    );
    assert.deepStrictEqual(body, { status: "ok" });
  } finally {
    server.close();
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
});

test("unknown /api paths return JSON 404", async () => {
  const router = new Router();
  const app = createApp(router);

  const server = await startServer(app);
  try {
    const response = await fetch(baseUrl(server) + "/api/unknown");

    assert.strictEqual(response.status, 404);
    assert.ok(
      response.headers.get("content-type").includes("application/json"),
      "expected a JSON content-type",
    );
    const body = await response.json();
    assert.ok(typeof body.error.code === "string");
    assert.ok(typeof body.error.message === "string");
  } finally {
    server.close();
  }
});

test("malformed JSON on /api/bookings returns JSON 400", async () => {
  const router = new Router();
  const app = createApp(router);

  const server = await startServer(app);
  try {
    const response = await fetch(baseUrl(server) + "/api/bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });

    assert.strictEqual(response.status, 400);
    assert.ok(
      response.headers.get("content-type").includes("application/json"),
      "expected a JSON content-type",
    );
    const body = await response.json();
    assert.ok(typeof body.error.code === "string");
    assert.ok(typeof body.error.message === "string");
  } finally {
    server.close();
  }
});

test("error responses contain string code and message fields", async () => {
  const router = new Router();
  const app = createApp(router);

  const server = await startServer(app);
  try {
    const response = await fetch(baseUrl(server) + "/api/missing");

    assert.strictEqual(response.status, 404);
    const body = await response.json();
    assert.strictEqual(typeof body.error, "object");
    assert.ok(body.error !== null);
    assert.strictEqual(typeof body.error.code, "string");
    assert.strictEqual(typeof body.error.message, "string");
  } finally {
    server.close();
  }
});

// ---------------------------------------------------------------------------
// Static file serving tests
//
// GET / and GET /<file> pin static serving: they prove a real file is served
// with the right content type and body, which is what a separator-sensitive
// containment check used to break on Windows.
//
// The traversal test below pins the containment check itself. It requests
// literal ".." paths whose targets exist outside public/, so a 200 or a body
// containing those files means the check failed. Encoded and backslash cases
// are covered too, but they are refused for different reasons - see the
// comments in the test.
// ---------------------------------------------------------------------------

// Read the expectations from the real files so the tests cannot drift from
// what is actually on disk. import.meta.url keeps the paths independent of the
// directory the test runner is started from, and works on Windows.
const PUBLIC_INDEX_PATH = fileURLToPath(
  new URL("../public/index.html", import.meta.url),
);
const PROJECT_PACKAGE_PATH = fileURLToPath(
  new URL("../package.json", import.meta.url),
);
const PROJECT_SERVER_PATH = fileURLToPath(
  new URL("../src/server.js", import.meta.url),
);

const EXPECTED_INDEX_HTML = readFileSync(PUBLIC_INDEX_PATH, "utf8");

// The project name lives in package.json, which is outside public/. If any
// traversal response contains it, a file from outside public/ was served.
const OUTSIDE_PUBLIC_MARKER = JSON.parse(
  readFileSync(PROJECT_PACKAGE_PATH, "utf8"),
).name;

/**
 * Close a server and any keep-alive sockets it still holds, so the test run
 * does not hang waiting for idle connections.
 *
 * @param {import("node:http").Server} server
 * @returns {Promise<void>}
 */
async function stopServer(server) {
  if (typeof server.closeAllConnections === "function") {
    server.closeAllConnections();
  }
  await new Promise((resolve) => server.close(resolve));
}

/**
 * Send a GET request with the path exactly as written, bypassing the URL
 * normalisation that fetch() performs. Path traversal tests need the raw
 * "../" segments to reach the server, which fetch() would remove first.
 *
 * @param {import("node:http").Server} server
 * @param {string} rawPath
 * @returns {Promise<{ status: number, headers: object, body: string }>}
 */
function rawGet(server, rawPath) {
  const { port } = server.address();

  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        host: "127.0.0.1",
        port,
        method: "GET",
        path: rawPath,
        // A fresh agent per request means the socket is closed by the client
        // instead of being kept alive for later requests.
        agent: false,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode, headers: res.headers, body });
        });
      },
    );

    req.on("error", reject);
    req.end();
  });
}

test("GET / serves public/index.html as HTML", async () => {
  const router = new Router();
  const app = createApp(router);

  const server = await startServer(app);
  try {
    const response = await fetch(baseUrl(server) + "/");
    const body = await response.text();

    assert.strictEqual(response.status, 200);
    assert.ok(
      response.headers.get("content-type").includes("text/html"),
      "expected an HTML content-type",
    );
    assert.strictEqual(body, EXPECTED_INDEX_HTML);
    assert.ok(
      body.includes("<h1>Event Ticketing</h1>"),
      "expected the index page heading in the body",
    );
  } finally {
    await stopServer(server);
  }
});

test("GET /index.html serves the same HTML as GET /", async () => {
  const router = new Router();
  const app = createApp(router);

  const server = await startServer(app);
  try {
    const response = await fetch(baseUrl(server) + "/index.html");
    const body = await response.text();

    assert.strictEqual(response.status, 200);
    assert.ok(
      response.headers.get("content-type").includes("text/html"),
      "expected an HTML content-type",
    );
    assert.strictEqual(body, EXPECTED_INDEX_HTML);
  } finally {
    await stopServer(server);
  }
});

test("a missing static file returns a JSON 404", async () => {
  const router = new Router();
  const app = createApp(router);

  const server = await startServer(app);
  try {
    const response = await fetch(baseUrl(server) + "/does-not-exist.html");

    assert.strictEqual(response.status, 404);
    assert.ok(
      response.headers.get("content-type").includes("application/json"),
      "expected a JSON content-type",
    );
    const body = await response.json();
    assert.strictEqual(body.error.code, "NOT_FOUND");
    assert.strictEqual(typeof body.error.message, "string");
  } finally {
    await stopServer(server);
  }
});

test("path traversal cannot serve a file outside public/", async () => {
  const router = new Router();
  const app = createApp(router);

  const server = await startServer(app);

  // Preconditions: the targets below are real files outside public/. Without
  // this, a 404 would prove nothing, because a missing file 404s anyway.
  assert.ok(
    existsSync(PROJECT_PACKAGE_PATH),
    "package.json must exist outside public/",
  );
  assert.ok(
    existsSync(PROJECT_SERVER_PATH),
    "src/server.js must exist outside public/",
  );

  const attempts = [
    // Literal traversal: ".." climbs out of public/, so these reach the
    // containment check on both Windows and POSIX and must be refused there.
    "/../package.json",
    "/../../package.json",
    "/../src/server.js",
    // Encoded traversal: the app never decodes these, so they stay literal
    // file names inside public/ and are refused as missing files, not by the
    // containment check. They pin that no decoding is introduced silently.
    "/..%2fpackage.json",
    "/%2e%2e/package.json",
    // Backslash traversal: a separator on Windows, where the check refuses it;
    // an ordinary filename character on POSIX, where it is simply missing.
    "/..\\package.json",
  ];

  try {
    for (const attempt of attempts) {
      const response = await rawGet(server, attempt);

      assert.strictEqual(response.status, 404, `expected 404 for ${attempt}`);
      assert.ok(
        !response.body.includes(OUTSIDE_PUBLIC_MARKER),
        `traversal leaked package.json contents for ${attempt}`,
      );
      assert.ok(
        !response.body.includes("createApp"),
        `traversal leaked src/server.js contents for ${attempt}`,
      );
    }
  } finally {
    await stopServer(server);
  }
});
