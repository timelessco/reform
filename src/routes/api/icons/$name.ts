import { createFileRoute } from "@tanstack/react-router";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { publicCorsHeaders } from "@/lib/config/embed-cors";

const CORS_HEADERS = {
  ...publicCorsHeaders,
  "Cache-Control": "public, max-age=86400, immutable",
  "Content-Type": "image/svg+xml; charset=utf-8",
};

// Validate up-front so no user input ever flows into the RegExp constructor.
const NAME_RE = /^[a-z0-9-]{1,64}$/i;

// Bound the symbol cache so an attacker scanning names can't grow it
// indefinitely. 2× the real icon count is more than enough headroom.
const MAX_CACHE_SIZE = 1024;

let spriteCache: string | null = null;
let spritePromise: Promise<string> | null = null;
const symbolCache = new Map<string, string>();

const loadSprite = (): Promise<string> => {
  if (spriteCache) return Promise.resolve(spriteCache);
  if (spritePromise) return spritePromise;
  const path = join(process.cwd(), "public", "sprite.svg");
  spritePromise = readFile(path, "utf-8").then((text) => {
    spriteCache = text;
    spritePromise = null;
    return text;
  });
  return spritePromise;
};

// Defensive scrub: even though sprite.svg is a trusted build artifact, strip
// any <script> elements and on* event handlers before caching. If someone ever
// rewires this SVG into a context that executes scripts (e.g. innerHTML or
// <object>), we stay safe.
const sanitizeSvgFragment = (fragment: string): string =>
  fragment
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");

const extractSymbol = (sprite: string, name: string): string | null => {
  const cached = symbolCache.get(name);
  if (cached) return cached;
  const re = new RegExp(`<symbol[^>]*\\bid="${name}"[^>]*>([\\s\\S]*?)</symbol>`, "i");
  const match = sprite.match(re);
  if (!match) return null;
  const inner = sanitizeSvgFragment(match[1]);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">${inner}</svg>`;
  if (symbolCache.size >= MAX_CACHE_SIZE) symbolCache.clear();
  symbolCache.set(name, svg);
  return svg;
};

export const Route = createFileRoute("/api/icons/$name")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ params }: { params: { name: string } }) => {
        const name = params.name.replace(/\.svg$/i, "");
        if (!NAME_RE.test(name)) {
          return new Response("invalid name", { status: 400, headers: CORS_HEADERS });
        }
        try {
          const sprite = await loadSprite();
          const svg = extractSymbol(sprite, name);
          if (!svg) {
            return new Response("not found", { status: 404, headers: CORS_HEADERS });
          }
          return new Response(svg, { status: 200, headers: CORS_HEADERS });
        } catch {
          return new Response("error", { status: 500, headers: CORS_HEADERS });
        }
      },
    },
  },
});
