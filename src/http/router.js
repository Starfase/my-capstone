// src/http/router.js
// Build 3 Step 3 — small HTTP router for the server skeleton.
//
// Routes are matched by HTTP method and path pattern. Path patterns may
// include named params, for example "/api/bookings/:id".
//
// The router does not parse request bodies. Body handling belongs in the
// application layer, because only some routes expect a JSON body.

const UNMATCHED = Symbol("unmatched");

/** @type {string[]} */
const ESCAPE_CHARS = "\\^$.*+?()[]{}|".split("");

/**
 * Convert a path pattern like "/api/events/:id" into a regular expression
 * that captures named params.
 *
 * Only forward slashes, alphanumerics, hyphens, underscores and dots are
 * treated as literal path characters. Everything else is rejected at route
 * registration time.
 */
function patternToRegex(pattern) {
  if (typeof pattern !== "string") {
    throw new Error("route pattern must be a string");
  }

  if (!pattern.startsWith("/")) {
    throw new Error("route pattern must start with /");
  }

  const paramNames = [];
  let regexSource = "";

  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];

    if (ch === ":") {
      // Read the param name.
      let name = "";
      i++;

      while (i < pattern.length && /[a-zA-Z0-9_]/.test(pattern[i])) {
        name += pattern[i];
        i++;
      }

      if (name === "") {
        throw new Error("route param must have a name after :");
      }

      paramNames.push(name);
      regexSource += "([^/]+)";
      continue;
    }

    if (ch === "*" && regexSource.length === 0) {
      throw new Error("route pattern must start with /");
    }

    // Escape regex-meta characters so they are treated literally.
    if (ESCAPE_CHARS.includes(ch)) {
      regexSource += `\\${ch}`;
    } else {
      regexSource += ch;
    }

    i++;
  }

  const regex = new RegExp(`^${regexSource}$`);
  return { regex, paramNames };
}

/**
 * Normalize an incoming path so that:
 * - it starts with "/"
 * - multiple slashes are collapsed
 * - a trailing slash is preserved only when the request path ended with one
 *
 * This keeps route matching predictable without altering the meaning of a
 * request that deliberately ends with "/".
 */
function normalizePath(path) {
  if (typeof path !== "string") {
    return "/";
  }

  if (path === "") {
    return "/";
  }

  if (!path.startsWith("/")) {
    return `/${path}`;
  }

  // Collapse repeated slashes but keep the trailing one if it was present.
  const endedWithSlash = path.endsWith("/");
  const collapsed = path.replace(/\/{2,}/g, "/");
  let normalized = collapsed;

  if (endedWithSlash && normalized.length > 1) {
    normalized = normalized + "/";
  }

  return normalized;
}

/** @typedef {Object} NormalizedRoute */
/** @property {string} method */
/** @property {string} pattern */
/** @property {Function} handler */
/** @property {{ regex: RegExp, paramNames: string[] }} _compiled */
/** @property {boolean} expectsJsonBody */

/**
 * NormalizedRoute describes a registered route.
 */
class NormalizedRoute {
  /**
   * @param {string} method
   * @param {string} pattern
   * @param {Function} handler
   */
  constructor(method, pattern, handler) {
    this.method = method.toUpperCase();
    this.pattern = pattern;
    this.handler = handler;
    this._compiled = patternToRegex(pattern);
    /** @type {boolean} */
    this.expectsJsonBody = false;
  }

  /**
   * Try to match a request path against this route.
   *
   * @param {string} path
   * @returns {{[key: string]: string} | null}
   */
  matchPath(path) {
    const params = {};
    const match = this._compiled.regex.exec(path);

    if (!match) {
      return null;
    }

    for (let i = 0; i < this._compiled.paramNames.length; i++) {
      params[this._compiled.paramNames[i]] = match[i + 1];
    }

    return params;
  }
}

/** @typedef {Object} Router */
/** @property {NormalizedRoute[]} #routes */

/**
 * Router stores registered routes and matches incoming requests.
 */
export class Router {
  /** @param {Array<{method: string, pattern: string, handler: Function}>} [routes] */
  constructor(routes = []) {
    /** @type {NormalizedRoute[]} */
    this.#routes = [];

    for (const route of routes) {
      this.add(route.method, route.pattern, route.handler);
    }
  }

  #routes;

  /**
   * Register a route.
   *
   * @param {string} method - HTTP method, for example "GET" or "POST".
   * @param {string} pattern - path pattern, for example "/health" or "/api/events/:id".
   * @param {Function} handler - async or sync handler with signature (req, params).
   */
  add(method, pattern, handler) {
    if (typeof method !== "string" || method === "") {
      throw new Error("route method must be a non-empty string");
    }

    if (typeof handler !== "function") {
      throw new Error("route handler must be a function");
    }

    const normalized = new NormalizedRoute(method, pattern, handler);
    this.#routes.push(normalized);
  }

  /**
   * Find a matching route for the given request.
   *
   * @param {string} method
   * @param {string} path
   * @returns {{ route: NormalizedRoute, params: {[key: string]: string} } | null}
   */
  findRoute(method, path) {
    const normalizedPath = normalizePath(path);
    const upperMethod = method.toUpperCase();

    for (const route of this.#routes) {
      if (route.method !== upperMethod) {
        continue;
      }

      const params = route.matchPath(normalizedPath);
      if (params !== null) {
        return { route, params };
      }
    }

    return null;
  }
}

/**
 * Parse a request body as JSON only when the caller explicitly asks for it.
 *
 * This is intentionally selective. Not every request has a body, and not
 * every body should be parsed as JSON.
 *
 * @param {import("node:http").IncomingMessage} req
 * @returns {Promise<any>}
 */
export async function parseBodyAsJson(req) {
  const raw = await readBody(req);
  if (raw === "") {
    throw new Error("request body is empty");
  }
  return JSON.parse(raw);
}

/**
 * Read a request body as a UTF-8 string.
 *
 * @param {import("node:http").IncomingMessage} req
 * @returns {Promise<string>}
 */
export async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => {
      chunks.push(chunk);
    });

    req.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer.toString("utf8"));
    });

    req.on("error", reject);
  });
}
