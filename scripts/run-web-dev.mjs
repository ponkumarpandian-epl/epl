import { spawn } from "node:child_process";
import process from "node:process";

import { loadRootEnv } from "./load-root-env.mjs";

loadRootEnv();

const command = process.platform === "win32" ? "npm.cmd" : "npm";

const child = spawn(command, ["run", "dev", "--workspace", "@epl/web"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

const forwardSignal = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on("SIGINT", forwardSignal);
process.on("SIGTERM", forwardSignal);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
