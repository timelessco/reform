#!/usr/bin/env node
/**
 * Patches @tanstack/start-server-core to export getH3Event
 * This is needed because TanStack Start doesn't export the h3 event accessor,
 * which is required for setting response headers that persist (e.g., electric-* headers)
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const nodeModulesPath = join(process.cwd(), "node_modules", "@tanstack", "start-server-core", "dist", "esm");

// Patch request-response.js to export getH3Event
const requestResponsePath = join(nodeModulesPath, "request-response.js");
let requestResponse = readFileSync(requestResponsePath, "utf-8");

if (!requestResponse.includes("getH3Event,")) {
  // Add getH3Event to exports
  requestResponse = requestResponse.replace(
    "export {\n  clearResponseHeaders,",
    "export {\n  clearResponseHeaders,\n  getH3Event,"
  );
  writeFileSync(requestResponsePath, requestResponse);
  console.log("✓ Patched request-response.js to export getH3Event");
} else {
  console.log("✓ request-response.js already patched");
}

// Patch index.js to import and re-export getH3Event
const indexPath = join(nodeModulesPath, "index.js");
let index = readFileSync(indexPath, "utf-8");

if (!index.includes("getH3Event,")) {
  // Add getH3Event to imports
  index = index.replace(
    "import { clearResponseHeaders, clearSession, deleteCookie, getCookie, getCookies, getRequest,",
    "import { clearResponseHeaders, clearSession, deleteCookie, getCookie, getCookies, getH3Event, getRequest,"
  );

  // Add getH3Event to exports
  index = index.replace(
    "export {\n  HEADERS,\n  VIRTUAL_MODULES,\n  attachRouterServerSsrUtils,\n  clearResponseHeaders,\n  clearSession,\n  createRequestHandler,\n  createStartHandler,\n  defineHandlerCallback,\n  deleteCookie,\n  getCookie,\n  getCookies,\n  getRequest,",
    "export {\n  HEADERS,\n  VIRTUAL_MODULES,\n  attachRouterServerSsrUtils,\n  clearResponseHeaders,\n  clearSession,\n  createRequestHandler,\n  createStartHandler,\n  defineHandlerCallback,\n  deleteCookie,\n  getCookie,\n  getCookies,\n  getH3Event,\n  getRequest,"
  );

  writeFileSync(indexPath, index);
  console.log("✓ Patched index.js to export getH3Event");
} else {
  console.log("✓ index.js already patched");
}

console.log("✓ @tanstack/start-server-core patched successfully");
