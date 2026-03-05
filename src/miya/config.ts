export function isMiyaEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.MIYA_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on";
}

export function resolveMiyaBaseDir(workspaceDir: string): string {
  return `${workspaceDir.replace(/\/$/, "")}/miya`;
}
