import { getPathAdapterForInput } from "../platform/index.js";

export function isMiyaEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.MIYA_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on";
}

export function resolveMiyaBaseDir(workspaceDir: string): string {
  const adapter = getPathAdapterForInput(workspaceDir);
  const normalized = adapter.normalize(workspaceDir.trim());
  const safeBase = adapter.trimTrailingSeparator(normalized);
  return adapter.join(safeBase || normalized, "miya");
}
