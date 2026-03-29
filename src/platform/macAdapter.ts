import path from "node:path";

import type { PlatformPathAdapter } from "./windowsAdapter.js";

const TRAILING_SEPARATOR_RE = /[\\/]+$/;

export const macAdapter: PlatformPathAdapter = {
  id: "mac",
  join: (...parts) => path.posix.join(...parts),
  normalize: (input) => path.posix.normalize(input),
  trimTrailingSeparator: (input) => input.replace(TRAILING_SEPARATOR_RE, ""),
};
