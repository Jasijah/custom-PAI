import path from "node:path";

export type PlatformPathAdapter = {
  id: "windows" | "mac" | "linux";
  join: (...parts: string[]) => string;
  normalize: (input: string) => string;
  trimTrailingSeparator: (input: string) => string;
};

const TRAILING_SEPARATOR_RE = /[\\/]+$/;

export const windowsAdapter: PlatformPathAdapter = {
  id: "windows",
  join: (...parts) => path.win32.join(...parts),
  normalize: (input) => path.win32.normalize(input),
  trimTrailingSeparator: (input) => input.replace(TRAILING_SEPARATOR_RE, ""),
};
