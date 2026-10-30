/**
 * TanStack DB 1.0 RC migration: `useLiveQuery(fn, deps)` -> `useLiveQuery({ query: fn })`.
 * Dep arrays were removed; query identity is derived from the structured IR.
 *
 * TS 7 ships no compiler API, so this is a small paren/string-aware scanner:
 * find `useLiveQuery(` / `useLiveInfiniteQuery(`, walk to the matching close paren,
 * split top-level args, and rewrite when the second arg is the old dep array.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = "src";

const NAMES = ["useLiveQuery", "useLiveInfiniteQuery"];

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) return walk(full);

    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".gen.ts") ? [full] : [];
  });

/** Index of the `)` matching the `(` at `open`. Skips strings, templates, comments. */
const matchParen = (src: string, open: number): number => {
  let depth = 0;

  for (let i = open; i < src.length; i += 1) {
    const ch = src[i];

    if (ch === "/" && src[i + 1] === "/") {
      i = src.indexOf("\n", i);

      if (i === -1) return -1;
      continue;
    }

    if (ch === "/" && src[i + 1] === "*") {
      i = src.indexOf("*/", i + 2);

      if (i === -1) return -1;
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i += 1;

      while (i < src.length && src[i] !== quote) {
        if (src[i] === "\\") i += 1;
        i += 1;
      }

      continue;
    }

    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;

      if (depth === 0) return i;
    }
  }

  return -1;
};

/** Top-level comma positions between `open` and `close`. */
const splitArgs = (src: string, open: number, close: number): number[] => {
  const commas: number[] = [];
  let depth = 0;

  for (let i = open + 1; i < close; i += 1) {
    const ch = src[i];

    if (ch === "/" && src[i + 1] === "/") {
      i = src.indexOf("\n", i);

      if (i === -1) break;
      continue;
    }

    if (ch === "/" && src[i + 1] === "*") {
      i = src.indexOf("*/", i + 2) + 1;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i += 1;

      while (i < src.length && src[i] !== quote) {
        if (src[i] === "\\") i += 1;
        i += 1;
      }

      continue;
    }

    if ("([{".includes(ch)) depth += 1;
    else if (")]}".includes(ch)) depth -= 1;
    else if (ch === "," && depth === 0) commas.push(i);
  }

  return commas;
};

let files = 0;

let calls = 0;

for (const file of walk(ROOT)) {
  const src = fs.readFileSync(file, "utf8");
  const edits: Array<{ start: number; end: number; text: string }> = [];

  for (const name of NAMES) {
    let from = 0;

    for (;;) {
      const at = src.indexOf(`${name}(`, from);

      if (at === -1) break;
      from = at + name.length;

      // Skip `function useLiveQuery(` declarations and imports.
      const prefix = src.slice(Math.max(0, at - 30), at);

      if (/function\s+$/.test(prefix) || /^\s*import\b.*$/m.test(prefix)) continue;

      const open = at + name.length;
      const close = matchParen(src, open);

      if (close === -1) continue;

      const commas = splitArgs(src, open, close);

      // A trailing comma in the argument list produces an empty final segment.
      const bounds = [open, ...commas, close];
      const args: Array<{ index: number; text: string }> = [];

      for (let k = 0; k < bounds.length - 1; k += 1) {
        const text = src.slice(bounds[k] + 1, bounds[k + 1]).trim();

        if (text !== "") args.push({ index: k, text });
      }

      if (args.length !== 2) continue;

      const second = args[1].text;

      if (!second.startsWith("[")) continue;

      edits.push({ start: at, end: open + 1, text: `${name}({ query: ` });
      edits.push({ start: commas[0], end: close + 1, text: " })" });
      calls += 1;
    }
  }

  if (edits.length === 0) continue;

  let out = src;

  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  }

  fs.writeFileSync(file, out);
  files += 1;
  console.log(`${file}: ${edits.length / 2} call(s)`);
}

console.log(`\n${files} file(s), ${calls} call(s) rewritten`);
