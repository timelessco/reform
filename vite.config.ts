import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
	resolve: {
		alias: {
			"tanstack-db-pglite": "tanstack-db-pglite/dist/index.js",
		},
	},
	plugins: [
		devtools({
			editor: {
				name: "Cursor",
				open: async (path, lineNumber, columnNumber) => {
					const { exec } = await import("node:child_process");
					exec(
						// or windsurf/cursor/webstorm/cursor/cursor
						`cursor -g "${(path).replaceAll("$", "\\$")}${lineNumber ? `:${lineNumber}` : ""}${columnNumber ? `:${columnNumber}` : ""}"`,
					);
				},
			},
		}),
		nitro({}),
		// this is the plugin that enables path aliases
		viteTsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
		tailwindcss(),
		tanstackStart({
			client: {},
			spa: {
				enabled: true,
			},
		}),
		viteReact({
			babel: {
				plugins: ["babel-plugin-react-compiler"],
			},
		}),
	],
	ssr: {
		noExternal: [/^@platejs\//, "katex", "react-tweet"],
		// Browser-only packages (IndexedDB), externalize for SSR
		external: ["dexie", "tanstack-dexie-db-collection", "tanstack-db-pglite"],
	},
});

export default config;
