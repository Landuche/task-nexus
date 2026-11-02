import { execFileSync, spawn } from "node:child_process";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
  detached: process.platform !== "win32",
  stdio: "inherit",
});

async function waitForServer(url, attempts = 120) {
  for (let i = 0; i < attempts; i++) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`Server did not start at ${url}`);
}

// Kills the whole process tree: Next forks workers that would otherwise outlive the parent.
function stopTree(child) {
  if (!child || child.killed || child.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    try {
      execFileSync(
        "taskkill.exe",
        ["/pid", String(child.pid), "/T", "/F"],
        { stdio: "ignore" }
      );
    } catch {
      child.kill();
    }
  } else {
    process.kill(-child.pid, "SIGTERM");
  }
}

let exitCode = 1;
try {
  await waitForServer(BASE_URL);
  exitCode = await new Promise((resolve) => {
    const runner = spawn(
      process.execPath,
      ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
      { stdio: "inherit", env: { ...process.env, PLAYWRIGHT_BASE_URL: BASE_URL } },
    );
    runner.on("exit", (code) => resolve(code ?? 1));
  });
} finally {
  stopTree(server);
}

process.exit(exitCode);
