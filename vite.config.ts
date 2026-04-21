import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
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

const config = defineConfig({
  plugins: [
    embedCacheHeadersPlugin(),
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
          runtime: "nodejs22.x",
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
      rsc: {
        enabled: true,
      },
    }),
    rsc(),
    viteReact(),
  ],
  resolve: {
    dedupe: ["@platejs/core"],
  },
  build: {
    // Emit .vite/manifest.json so the server can resolve lazy field chunks
    // and emit <link rel="modulepreload"> for the fields used on step 1.
    manifest: true,
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
    noExternal: [/^@platejs\//, "platejs", "@udecode/utils", "katex", "react-tweet"],
    external: [
      "dexie",
      "tanstack-dexie-db-collection",
      "fsevents",
      "pg",
      "pg-native",
      "pg-types",
      "pg-cloudflare",
      "pgpass",
      "postgres-bytea",
      "postgres-array",
      "postgres-date",
      "postgres-interval",
      "drizzle-orm",
      "drizzle-orm/node-postgres",
    ],
  },
  environments: {
    rsc: {
      resolve: {
        external: [
          "pg",
          "pg-native",
          "pg-types",
          "pg-cloudflare",
          "pgpass",
          "postgres-bytea",
          "postgres-array",
          "postgres-date",
          "postgres-interval",
          "drizzle-orm",
          "drizzle-orm/node-postgres",
        ],
        // Inline platejs + its slate/utils deps so the re-export chain is
        // resolved at bundle time. Leaving them external lets Rollup guess
        // which sibling package a re-exported name came from (e.g. bindFirst
        // lives in @udecode/utils but gets guessed as @platejs/slate), and
        // the wrong guess breaks downstream consumers of the RSC output.
        //
        // Must mirror `ssr.noExternal`: any Plate plugin transitive dep left
        // external is loaded + transpiled by Bun at request time, which fails
        // on Vercel's read-only filesystem ("bun is unable to write files").
        // katex comes in via @platejs/math → BaseMathKit → BaseEditorKit.
        noExternal: [/^@platejs\//, "platejs", "@udecode/utils", "katex", "react-tweet"],
      },
    },
  },
  optimizeDeps: {
    // Defense against server-only deps leaking into the client dep-prebundler.
    // If a server fn module is ever scanned for client (during route-tree
    // analysis), these node-only packages would otherwise be eagerly bundled
    // and crash on Buffer/process references at module load.
    // `@base-ui/react` is excluded per the RSC plugin's inconsistent-
    // optimization warning (client components consumed across SSR + RSC
    // envs).
    exclude: [
      "pg",
      "pg-native",
      "pg-types",
      "pg-cloudflare",
      "pgpass",
      "postgres-bytea",
      "postgres-array",
      "postgres-date",
      "postgres-interval",
      "drizzle-orm/node-postgres",
      "@base-ui/react",
    ],
    // Force-include CJS-only `use-sync-external-store` so Vite extracts its
    // named exports correctly. The shim uses a `module.exports = require(...)`
    // indirection that Vite's auto-scan misses after the lockfile churn.
    include: ["use-sync-external-store/shim", "use-sync-external-store/shim/with-selector"],
  },
});

export default config;
