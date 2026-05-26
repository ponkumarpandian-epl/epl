import process from "node:process";

const TRUTHY_VALUES = new Set(["1", "true", "yes", "on"]);

export function usesStubbedBackend(env = process.env) {
  const value = env.USE_STUBBED_BACKEND;

  if (value === undefined || value === null || value === "") {
    return true;
  }

  return TRUTHY_VALUES.has(String(value).trim().toLowerCase());
}
