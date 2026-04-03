import path from "node:path";

import { macAdapter } from "./macAdapter.js";
import type { PlatformPathAdapter } from "./windowsAdapter.js";
import { windowsAdapter } from "./windowsAdapter.js";

const TRAILING_SEPARATOR_RE = /[\\/]+$/;

const linuxAdapter: PlatformPathAdapter = {
  id: "linux",
  join: (...parts) => path.posix.join(...parts),
  normalize: (input) => path.posix.normalize(input),
  trimTrailingSeparator: (input) => input.replace(TRAILING_SEPARATOR_RE, ""),
};

export function getPlatformPathAdapter(
  platform: NodeJS.Platform = process.platform,
): PlatformPathAdapter {
  if (platform === "win32") return windowsAdapter;
  if (platform === "darwin") return macAdapter;
  return linuxAdapter;
}

export function getPathAdapterForInput(inputPath: string): PlatformPathAdapter {
  if (/^[a-zA-Z]:[\\/]/.test(inputPath) || inputPath.includes("\\")) {
    return windowsAdapter;
  }
  return getPlatformPathAdapter();
}
