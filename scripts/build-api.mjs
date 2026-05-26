import { spawnSync } from "node:child_process";
import process from "node:process";

import { usesStubbedBackend } from "./backend-mode.mjs";
import { loadRootEnv } from "./load-root-env.mjs";

loadRootEnv();

function hasCommand(command) {
  return spawnSync("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" })
    .status === 0;
}

const dotnetEnv = {
  ...process.env,
  DOTNET_CLI_TELEMETRY_OPTOUT: "1",
};

if (!usesStubbedBackend()) {
  console.log(
    "USE_STUBBED_BACKEND=false, so the local seeded API build is being skipped.",
  );
  process.exit(0);
}

if (hasCommand("dotnet")) {
  const result = spawnSync(
    "dotnet",
    ["build", "apps/api/Epl.Api.slnx", "-c", "Release"],
    {
      stdio: "inherit",
      env: dotnetEnv,
    },
  );

  process.exit(result.status ?? 0);
}

if (hasCommand("docker")) {
  const result = spawnSync(
    "docker",
    ["build", "-f", "apps/api/src/Epl.Api/Dockerfile", "."],
    {
      stdio: "inherit",
      env: process.env,
    },
  );

  process.exit(result.status ?? 0);
}

console.error(
  "Neither `dotnet` nor `docker` is available. Install one of them to build the API.",
);
process.exit(1);
