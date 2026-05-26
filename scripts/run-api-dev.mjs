import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

import { usesStubbedBackend } from "./backend-mode.mjs";
import { loadRootEnv } from "./load-root-env.mjs";

loadRootEnv();

function hasCommand(command) {
  if (process.platform === "win32") {
    return spawnSync("where", [command], { stdio: "ignore" }).status === 0;
  }
  return spawnSync("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" })
    .status === 0;
}

function run(command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      ...extraEnv,
    },
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
}

if (!usesStubbedBackend()) {
  if (!process.env.ACTUAL_BACKEND_API_URL) {
    console.warn(
      "USE_STUBBED_BACKEND=false, so the local seeded API will not start. Set ACTUAL_BACKEND_API_URL for the frontend proxy.",
    );
  } else {
    console.log(
      `USE_STUBBED_BACKEND=false, skipping local seeded API and routing to ${process.env.ACTUAL_BACKEND_API_URL}.`,
    );
  }

  process.exit(0);
}

if (hasCommand("dotnet")) {
  run(
    "dotnet",
    [
      "watch",
      "run",
      "--project",
      "apps/api/src/Epl.Api/Epl.Api.csproj",
      "--urls",
      "http://0.0.0.0:8080",
    ],
    {
      DOTNET_CLI_TELEMETRY_OPTOUT: "1",
    },
  );
} else if (hasCommand("docker")) {
  run("docker", ["compose", "up", "--build", "api"]);
} else {
  console.error(
    "Neither `dotnet` nor `docker` is available. Install one of them to run the API.",
  );
  process.exit(1);
}
