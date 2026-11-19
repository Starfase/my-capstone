// src/http/app.js
// Build 3 Step 3 HTTP application.
//
// Responsibilities:
//  - delegate JSON API requests to the router
//  - return a uniform JSON error shape
//  - return JSON 400 only when a route expects a JSON body and parsing fails
//  - return JSON 404 for unmatched /api paths on every method
//  - serve static files from public/ safely
//
// This module must never expose stack traces or internal filesystem paths
// to clients. Business rules do not live here; they belong in the domain
// layer.

import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import { Router, parseBodyAsJson } from "./router.js";

/**
 * Purposeful, client-safe error codes for the HTTP layer.
 * These are not domain error codes from src/domain/errors.js.
 */
const HTTP_ERROR_CODES = Object.freeze({
  NOT_FOUND: "NOT_FOUND",
  BAD_REQUEST: "BAD_REQUEST",
});

const PUBLIC_DIR = path.join(process.cwd(), "public");
const INDEX_NAME = "index.html";

/**
 * Build a JSON error response in the required shape.
 *
 * @param {number} statusCode
 * @param {string} code
 * @param {string} message
 * @returns {Promise<void>}
 */
function writeJsonError(res, statusCode, code, message) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ error: { code, message } }));
}

/**
 * Build a JSON success response.
 *
 * @param {object} payload
 * @param {import("node:http").ServerResponse} res
 * @returns {Promise<void>}
 */
function writeJson(res, payload) {
  res.statusCode = res.statusCode || 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

/**
 * Ensure a path is safely inside the public directory.
 *
 * @param {string} requestedPath
 * @returns {string} absolute path inside PUBLIC_DIR
 * @throws {Error} if the path escapes public/
 */
function resolveSafePublicPath(requestedPath) {
  // Join first: path.join normalises the *combined* path, so a ".." segment
  // climbs relative to public/ instead of being clamped at "/" beforehand.
  // That is what makes the containment check below reachable and load-bearing.
  const joined = path.join(PUBLIC_DIR, requestedPath);
  const resolved = path.resolve(joined);
  const publicRoot = path.resolve(PUBLIC_DIR);

  // Compare with path.relative instead of string prefixes: it understands
  // the platform's separator ("\\" on Windows) and returns a path that
  // starts with ".." only when the target is genuinely outside public/.
  const relative = path.relative(publicRoot, resolved);
  const escapesPublicDir =
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative);

  if (escapesPublicDir) {
    throw new Error("path escapes the public directory");
  }

  return resolved;
}

/**
 * Service a static file from public/.
 *
 * Directory requests like "/" or "/some/" map to index.html when present.
 * Requests for paths that do not map to a real file get a 404 page that
 * uses the same JSON shape as the REST API 404.
 *
 * Path traversal is rejected before any filesystem access.
 *
 * @param {string} requestedPath
 * @param {import("node:http").ServerResponse} res
 * @returns {Promise<void>}
 */
async function serveStatic(requestedPath, res) {
  let filePath;

  try {
    filePath = resolveSafePublicPath(requestedPath);
  } catch (error) {
    writeJsonError(res, 404, HTTP_ERROR_CODES.NOT_FOUND, "not found");
    return;
  }

  let stats;
  try {
    stats = statSync(filePath);
  } catch (error) {
    writeJsonError(res, 404, HTTP_ERROR_CODES.NOT_FOUND, "not found");
    return;
  }

  // Directory -> try index.html inside it.
  if (stats.isDirectory()) {
    const indexPath = path.join(filePath, INDEX_NAME);
    let indexStats;
    try {
      indexStats = statSync(indexPath);
    } catch (error) {
      writeJsonError(res, 404, HTTP_ERROR_CODES.NOT_FOUND, "not found");
      return;
    }

    if (!indexStats.isFile()) {
      writeJsonError(res, 404, HTTP_ERROR_CODES.NOT_FOUND, "not found");
      return;
    }

    filePath = indexPath;
  }

  const contentType = guessContentType(filePath);
  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);

  const stream = createReadStream(filePath);
  stream.on("error", () => {
    // The file can vanish or become unreadable between statSync and the read.
    // If nothing has been written yet we can still answer with the standard
    // JSON error shape; otherwise the body is already truncated, so the only
    // safe move is to tear the response down rather than pretend it is whole.
    if (!res.headersSent) {
      writeJsonError(res, 500, "INTERNAL_ERROR", "internal server error");
    } else {
      res.destroy();
    }
  });
  stream.pipe(res);
}

/**
 * Choose a Content-Type based on the file extension.
 *
 * @param {string} filePath
 * @returns {string}
 */
function guessContentType(filePath) {
  const lower = filePath.toLowerCase();

  if (lower.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (lower.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (lower.endsWith(".js")) {
    return "application/javascript; charset=utf-8";
  }
  if (lower.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lower.endsWith(".svg")) {
    return "image/svg+xml; charset=utf-8";
  }
  if (lower.endsWith(".txt")) {
    return "text/plain; charset=utf-8";
  }

  return "application/octet-stream";
}

/**
 * Decide whether a request path should be treated as a JSON API request.
 *
 * Only paths under /api are treated as API paths. Everything else is
 * treated as a static file request. This keeps the two concerns clearly
 * separated.
 *
 * @param {string} requestPath
 * @returns {boolean}
 */
function isApiPath(requestPath) {
  return requestPath === "/api" || requestPath.startsWith("/api/");
}

/**
 * Route registration helper used by this app.
 *
 * @param {Router} router
 * @param {string} method
 * @param {string} pattern
 * @param {boolean} expectsJsonBody
 * @param {Function} handler
 */
function registerRoute(router, method, pattern, expectsJsonBody, handler) {
  router.add(method, pattern, handler);
  const match = router.findRoute(method, pattern);
  if (match) {
    match.route.expectsJsonBody = expectsJsonBody;
  }
}

/**
 * Build a node:http request handler from a router and the app's own routes.
 *
 * @param {Router} router
 * @returns {import("node:http").RequestHandler}
 */
export function createApp(router) {
  if (!(router instanceof Router)) {
    throw new Error("app requires a Router instance");
  }

  // Register the app's built-in routes. These are the only routes this
  // skeleton app owns; real features will add their own routes elsewhere.
  registerRoute(router, "GET", "/health", false, (req, params) => {
    return { status: "ok" };
  });

  registerRoute(
    router,
    "POST",
    "/api/bookings",
    true,
    async (req, params, requestInfo) => {
      if (!requestInfo.body) {
        throw new Error("request body is missing");
      }
      return { receivedBody: requestInfo.body };
    },
  );

  registerRoute(
    router,
    "GET",
    "/api/events/:id",
    false,
    (req, params) => ({
      eventId: params.id,
    }),
  );

  return async (req, res) => {
    const method = req.method || "GET";
    const rawPath = req.url || "/";
    const pathStr = rawPath.split("?")[0];

    try {
      const hasRoute = router.findRoute(method, pathStr) !== null;

      if (hasRoute || isApiPath(pathStr)) {
        await handleApi(method, pathStr, req, res, router);
        return;
      }

      await serveStatic(pathStr, res);
    } catch (error) {
      // Any unexpected server-side error must never leak details.
      writeJsonError(res, 500, "INTERNAL_ERROR", "internal server error");
    }
  };
}

/**
 * Handle a JSON API request.
 *
 * @param {string} method
 * @param {string} path
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {Router} router
 * @returns {Promise<void>}
 */
async function handleApi(method, path, req, res, router) {
  const match = router.findRoute(method, path);

  if (!match) {
    writeJsonError(res, 404, HTTP_ERROR_CODES.NOT_FOUND, "not found");
    return;
  }

  const { route, params } = match;

  let requestInfo = { body: undefined, method, path };
  if (route.expectsJsonBody) {
    try {
      requestInfo.body = await parseBodyAsJson(req);
    } catch (error) {
      writeJsonError(
        res,
        400,
        HTTP_ERROR_CODES.BAD_REQUEST,
        "request body is not valid JSON",
      );
      return;
    }
  }

  let result;
  try {
    result = await route.handler(req, params, requestInfo);
  } catch (error) {
    writeJsonError(res, 500, "INTERNAL_ERROR", "internal server error");
    return;
  }

  if (result && typeof result === "object" && "statusCode" in result && "body" in result) {
    res.statusCode = result.statusCode;
    writeJson(res, result.body);
    return;
  }

  writeJson(res, result);
}
