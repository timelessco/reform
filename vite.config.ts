import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import viteTsConfigPaths from "vite-tsconfig-paths";

// Custom Cache-Control headers for the public embed script so updates
// propagate quickly to embedders without requiring a versioned URL.
const setEmbedHeader = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
) => {
  if (req.url?.startsWith("/embed/popup.js")) {
    res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
  }
  next();
};

const embedCacheHeadersPlugin = (): Plugin => ({
  name: "embed-cache-headers",
  configureServer(server) {
    server.middlewares.use(setEmbedHeader);
  },
  configurePreviewServer(server) {
    server.middlewares.use(setEmbedHeader);
  },
});

// Serves .wasm files directly from /@fs/ paths before TanStack Start's catch-all
// intercepts them. Required by @tanstack/browser-db-sqlite-persistence (wa-sqlite).
const serveWasmFilesPlugin = (): Plugin => ({
  name: "serve-wasm-files",
  configureServer(server) {
    const wasmHandler = (
      req: IncomingMessage,
      res: ServerResponse,
      next: (err?: unknown) => void,
    ) => {
      const urlWithoutQuery = (req.url ?? "").split("?")[0];
      if (!urlWithoutQuery.endsWith(".wasm")) return next();
      const fsPrefix = "/@fs";
      const filePath = urlWithoutQuery.startsWith(fsPrefix)
        ? urlWithoutQuery.slice(fsPrefix.length)
        : undefined;
      if (!filePath || !fs.existsSync(filePath)) return next();
      const content = fs.readFileSync(filePath);
      res.writeHead(200, {
        "Content-Type": "application/wasm",
        "Content-Length": content.byteLength,
        "Cache-Control": "no-cache",
      });
      res.end(content);
    };
    // Unshift so this runs BEFORE TanStack Start's catch-all middleware
    server.middlewares.stack.unshift({ route: "", handle: wasmHandler });
  },
});

// Cross-origin isolation headers required by @tanstack/browser-db-sqlite-persistence
// (wa-sqlite OPFS needs FileSystemFileHandle.createSyncAccessHandle, which is gated
// behind cross-origin isolation / SharedArrayBuffer). `credentialless` avoids
// breaking third-party CDN assets that don't set CORP headers.
const crossOriginIsolationPlugin = (): Plugin => {
  const setHeaders = (_req: IncomingMessage, res: ServerResponse, next: (e?: unknown) => void) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    next();
  };
  return {
    name: "cross-origin-isolation",
    configureServer(server) {
      server.middlewares.use(setHeaders);
    },
    configurePreviewServer(server) {
      server.middlewares.use(setHeaders);
    },
  };
};

const config = defineConfig({
  plugins: [
    serveWasmFilesPlugin(),
    embedCacheHeadersPlugin(),
    crossOriginIsolationPlugin(),
    devtools({
      editor: {
        name: "Cursor",
        open: async (path, lineNumber, columnNumber) => {
          const { exec } = await import("node:child_process");
          exec(
            // or windsurf/cursor/webstorm/cursor/cursor
            `cursor -g "${path.replaceAll("$", "\\$")}${lineNumber ? `:${lineNumber}` : ""}${columnNumber ? `:${columnNumber}` : ""}"`,
          );
        },
      },
      // editor: {
      //   name: "Antigravity",
      //   open: async (path, lineNumber, columnNumber) => {
      //     const { exec } = await import("node:child_process");
      //     exec(
      //       `antigravity -g "${path.replaceAll("$", "\\$")}${lineNumber ? `:${lineNumber}` : ""}${columnNumber ? `:${columnNumber}` : ""}"`,
      //     );
      //   },
      // },
      enhancedLogs: {
        enabled: true,
      },
      logging: true,
      consolePiping: {
        enabled: true,
        levels: ["log", "warn", "error", "info", "debug"],
      },
    }),
    nitro({
      vercel: {
        functions: {
          maxDuration: 799,
          runtime: "bun1.x",
          supportsResponseStreaming: true,
        },
      },
    }),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart({
      router: {},
    }),
    viteReact(),
  ],
  resolve: {
    dedupe: ["@platejs/core"],
  },
  optimizeDeps: {
    // These packages bundle a Web Worker + wa-sqlite WASM. esbuild's
    // prebundle strips the worker bootstrap and asset references, so they
    // must be loaded as native ESM at runtime.
    exclude: [
      "@tanstack/db",
      "@tanstack/browser-db-sqlite-persistence",
      "@tanstack/db-sqlite-persistence-core",
      "@journeyapps/wa-sqlite",
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("@platejs/") || id.includes("platejs")) return "editor";
          if (id.includes("@radix-ui/")) return "ui";
          if (id.includes("@sentry/")) return "sentry";
        },
      },
    },
  },
  ssr: {
    noExternal: [/^@platejs\//, "katex", "react-tweet"],
    external: ["dexie", "tanstack-dexie-db-collection", "fsevents"],
  },
});

export default config;
