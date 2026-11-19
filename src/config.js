// src/config.js
// Build 3 Step 4 — shared configuration for the server.

/**
 * HTTP port for the server.
 * Defaults to 3000 unless the PORT environment variable is set.
 *
 * @type {number}
 */
export const PORT = Number.parseInt(process.env.PORT, 10) || 3000;

/**
 * Whether the server is running in a development-like local environment.
 * Not used yet; kept here so the server skeleton has a single place for
 * environment decisions.
 *
 * @type {boolean}
 */
export const IS_DEV = process.env.NODE_ENV !== "production";
