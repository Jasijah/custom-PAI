import { getPlatformPathAdapter, getPathAdapterForInput } from "../platform/index.js";

export function isMiyaEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.MIYA_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on";
}

export function resolveMiyaBaseDir(workspaceDir: string): string {
  const adapter =
    /^[a-zA-Z]:[\\/]/.test(workspaceDir) || workspaceDir.includes("\\")
      ? getPathAdapterForInput(workspaceDir)
      : getPlatformPathAdapter("linux");
  const normalized = adapter.normalize(workspaceDir.trim());
  const safeBase = adapter.trimTrailingSeparator(normalized);
  return adapter.join(safeBase || normalized, "miya");
}
