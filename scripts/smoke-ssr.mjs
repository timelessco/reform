import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";

const server = spawn(process.execPath, [".output/server/index.mjs"], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    NITRO_HOST: "127.0.0.1",
    NITRO_PORT: "0",
    DATABASE_URL: "postgresql://smoke:smoke@127.0.0.1:1/smoke",
    BETTER_AUTH_SECRET: "ssr-smoke-test-secret-with-at-least-32-characters",
    BETTER_AUTH_URL: "http://localhost",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
const recordOutput = (chunk) => {
  output = (output + chunk.toString()).slice(-20_000);
};
server.stdout.on("data", recordOutput);
server.stderr.on("data", recordOutput);

try {
  const url = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("SSR server startup timed out")), 30_000);
    server.once("error", reject);
    server.once("exit", (code) => reject(new Error(`SSR server exited with code ${code}`)));
    server.stdout.on("data", () => {
      const match = output.match(/Listening on:\s+(http:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
    timeout.unref();
  });

  const response = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: "manual" });
  const body = await response.text();
  assert.equal(response.status, 200, `Homepage returned ${response.status}: ${body.slice(0, 500)}`);
  assert.match(body, /<html[\s>]/, "Homepage did not return rendered HTML");
  console.log(
    "SSR smoke passed: the production homepage returns HTTP 200 and HTML without a database.",
  );
} catch (error) {
  console.error(output);
  throw error;
} finally {
  if (server.exitCode === null && server.signalCode === null) {
    const exited = once(server, "exit");
    server.kill("SIGTERM");
    const timeout = setTimeout(() => server.kill("SIGKILL"), 5_000);
    await exited;
    clearTimeout(timeout);
  }
}
