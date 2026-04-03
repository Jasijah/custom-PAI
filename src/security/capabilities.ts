import fs from "node:fs/promises";
import path from "node:path";

export type SecurityCapability =
  | "read_only"
  | "local_write"
  | "external_network"
  | "messaging"
  | "system_exec";

const HIGH_RISK_CAPABILITIES = new Set<SecurityCapability>([
  "local_write",
  "external_network",
  "messaging",
  "system_exec",
]);

function parseCapabilityList(raw: string | undefined): Set<SecurityCapability> {
  const out = new Set<SecurityCapability>();
  const parts = (raw ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  for (const part of parts) {
    if (
      part === "read_only" ||
      part === "local_write" ||
      part === "external_network" ||
      part === "messaging" ||
      part === "system_exec"
    ) {
      out.add(part);
    }
  }
  return out;
}

export function classifyToolCapability(toolName: string): SecurityCapability {
  const normalized = toolName.trim().toLowerCase();
  if (normalized === "bash" || normalized === "process") return "system_exec";
  if (
    normalized === "write" ||
    normalized === "edit" ||
    normalized === "multi_edit" ||
    normalized === "delete" ||
    normalized === "mkdir" ||
    normalized === "rename" ||
    normalized === "move"
  ) {
    return "local_write";
  }
  if (normalized === "send" || normalized === "discord") return "messaging";
  if (
    normalized === "browser" ||
    normalized === "canvas" ||
    normalized === "nodes" ||
    normalized === "cron" ||
    normalized === "gateway" ||
    normalized === "whatsapp_login"
  ) {
    return "external_network";
  }
  return "read_only";
}

export function isCapabilityAllowed(
  capability: SecurityCapability,
  env: NodeJS.ProcessEnv = process.env,
): { allowed: boolean; reason: string } {
  if (env.CLAWDIS_SECURITY_DISABLE_CAPABILITY_GATES === "1") {
    return {
      allowed: true,
      reason: "capability gates disabled by environment",
    };
  }

  if (!HIGH_RISK_CAPABILITIES.has(capability)) {
    return { allowed: true, reason: "read-only capability" };
  }

  const allowList = parseCapabilityList(env.CLAWDIS_SECURITY_ALLOW);
  const allowAll = (env.CLAWDIS_SECURITY_ALLOW ?? "")
    .split(",")
    .some((entry) => {
      return entry.trim() === "*";
    });
  if (allowAll || allowList.has(capability)) {
    return { allowed: true, reason: "capability explicitly allowed" };
  }

  return {
    allowed: false,
    reason:
      `capability "${capability}" denied by default; set CLAWDIS_SECURITY_ALLOW=${capability} ` +
      "(or comma-separated list) to allow",
  };
}

export async function appendSecurityAudit(params: {
  workspaceDir?: string;
  toolName: string;
  capability: SecurityCapability;
  allowed: boolean;
  reason: string;
}) {
  if (!params.workspaceDir?.trim()) return;
  const base = params.workspaceDir.trim();
  const auditDir = path.join(base, "security");
  const auditPath = path.join(auditDir, "audit.jsonl");
  const row = {
    ts: Date.now(),
    tool: params.toolName,
    capability: params.capability,
    allowed: params.allowed,
    reason: params.reason,
  };
  try {
    await fs.mkdir(auditDir, { recursive: true, mode: 0o700 });
    await fs.appendFile(auditPath, `${JSON.stringify(row)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
  } catch {
    // best-effort security audit trail only
  }
}
