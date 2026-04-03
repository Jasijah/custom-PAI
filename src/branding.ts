import os from "node:os";
import path from "node:path";

const DEFAULT_APP_NAME = "Personal AI";
const DEFAULT_CLI_NAME = "pai";
const DEFAULT_ASSISTANT_NAME = "assistant";
const DEFAULT_WORKSPACE_DIR = "clawd";
const DEFAULT_STATE_DIR = ".clawdis";

function readNonEmptyEnv(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  return raw;
}

export const BRAND_APP_NAME =
  readNonEmptyEnv("CLAWDIS_BRAND_APP_NAME") ?? DEFAULT_APP_NAME;

export const BRAND_CLI_NAME =
  readNonEmptyEnv("CLAWDIS_BRAND_CLI_NAME") ?? DEFAULT_CLI_NAME;

export const BRAND_ASSISTANT_NAME =
  readNonEmptyEnv("CLAWDIS_BRAND_ASSISTANT_NAME") ?? DEFAULT_ASSISTANT_NAME;

export const BRAND_DEFAULT_WORKSPACE = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? os.homedir(),
  readNonEmptyEnv("CLAWDIS_BRAND_WORKSPACE_DIR") ?? DEFAULT_WORKSPACE_DIR,
);

export const BRAND_DEFAULT_STATE_DIR =
  readNonEmptyEnv("CLAWDIS_BRAND_STATE_DIR") ?? DEFAULT_STATE_DIR;

export function withBrandCli(command: string): string {
  return `${BRAND_CLI_NAME} ${command}`;
}
