import type { KnipConfig } from "knip";

export default {
  entry: [
    "src/routes/**/*.{ts,tsx}", // Routes as entry points
    "src/embed/*.ts", // Embed scripts
    "src/server.ts", // TanStack Start server entry (framework convention, no static import)
    "instrument.server.mjs", // Sentry
    "drizzle.config.ts",
    "nitro.config.ts",
    "vitest.config.ts",
    "src/server/plugins/*.ts", // Nitro loads server plugins by convention.
  ],
  project: ["src/**/*.{ts,tsx}"],
  ignore: [
    ".output/**",
    "drizzle/**",
    "public/**",
    "tools/oxlint/anti-slop/**", // Vendored plugins loaded through Oxlint configuration.
    "src/routeTree.gen.ts",
    "src/components/ui/**", // shadcn - used dynamically
    "src/hooks/use-is-touch-device.ts", // imported only by ignored ui/** components
    "src/components/editor/plugins/**", // plate plugins - library exports (collab + onboarding + docx + ai-form-gen kits kept as caveat future work)
    "src/lib/editor/ai-form-nodes.ts", // AI form builder - consumed by upcoming AI generation task
    "src/lib/editor/ai-icon-matcher.ts", // AI icon matcher - consumed by upcoming AI generation task
    "src/lib/config/plan-config.ts", // Custom domains feature - consumed by upcoming tasks
    "src/lib/vercel-domains.ts", // Custom domains feature - consumed by upcoming tasks
    "src/lib/server-fn/custom-domains.ts", // Custom domains feature - consumed by upcoming tasks
    "src/lib/server-fn/custom-domain-loader.ts", // Custom domains feature - consumed by upcoming tasks
    "src/lib/server-fn/analytics.ts", // Analytics v1 - consumed by upcoming tasks
    "src/lib/audit/index.ts", // Audit logging - getAuditLogger() consumed by upcoming instrumentation phase
    "src/lib/icon-context.tsx", // icon-picker rework - consumed by upcoming tasks
    "src/lib/icon-map.tsx", // icon-picker rework - consumed by upcoming tasks
    "src/lib/vercel-oidc-stub.ts", // Vite alias target for @vercel/oidc (not directly imported)
    "src/lib/shape-context.tsx", // shape system - consumed by upcoming tasks
    "src/hooks/use-proximity-hover.ts", // proximity hover - consumed by upcoming tasks
    "src/components/evilcharts/**", // evilcharts package - some components are intentionally unused
    "src/types/**", // type exports
    "vite.config.ts", // config file default export
  ],
  ignoreDependencies: [
    "@tanstack/router-plugin", // vite plugin
    "tw-animate-css", // tailwind plugin
    "2026-01-08-platjs", // self-reference
    "@sentry/tanstackstart-react", // used in instrument.server.mjs (knip entry misses it)
    "shadcn", // imported in src/styles/styles.css
    "tailwindcss", // vite plugin + CSS @import
    "type-fest", // HasRequiredKeys type import in auth-query.ts
    "agentation", // reserved for in-progress devtools work (commented import in src/routes/-components/devtools.tsx)
  ],
  ignoreExportsUsedInFile: true,
  ignoreIssues: {
    "drizzle.config.ts": ["exports"],
    "nitro.config.ts": ["exports"],
    "vitest.config.ts": ["exports"],
    "src/server.ts": ["exports"],
    "src/server/plugins/*.ts": ["exports"],
  }, // Frameworks load these default exports at runtime.
  ignoreBinaries: ["orca"], // Local browser CLI used by the preview-generation script.
  rules: {
    unlisted: "off", // dev deps in config files are expected
  },
  compilers: {
    css: (text: string) => [...text.matchAll(/(?<=@)import[^;]+/g)].join("\n"),
  },
} satisfies KnipConfig;
