import path from "node:path";
import { appendJsonl, randomId, readJsonl } from "./storage.js";
import type {
  MiyaAuditEvent,
  MiyaPermissionGrant,
  MiyaPermissionScope,
} from "./types.js";

function grantsPath(baseDir: string) {
  return path.join(baseDir, "permissions.jsonl");
}

function auditPath(baseDir: string) {
  return path.join(baseDir, "audit.jsonl");
}

export async function grantPermission(params: {
  baseDir: string;
  scope: MiyaPermissionScope;
  grantSource: string;
  durationMs?: number;
  device?: string;
}) {
  const now = Date.now();
  const grant: MiyaPermissionGrant = {
    scope: params.scope,
    grantedAt: now,
    expiresAt: params.durationMs ? now + params.durationMs : null,
    revokedAt: null,
    grantSource: params.grantSource,
    device: params.device,
  };
  await appendJsonl(grantsPath(params.baseDir), grant);
  return grant;
}

export async function revokePermission(params: {
  baseDir: string;
  scope: MiyaPermissionScope;
}) {
  const grants = await readJsonl<MiyaPermissionGrant>(
    grantsPath(params.baseDir),
  );
  const latest = [...grants]
    .reverse()
    .find((entry) => entry.scope === params.scope && !entry.revokedAt);
  if (!latest) return null;
  const revoked: MiyaPermissionGrant = { ...latest, revokedAt: Date.now() };
  await appendJsonl(grantsPath(params.baseDir), revoked);
  return revoked;
}

export async function hasPermission(params: {
  baseDir: string;
  scope: MiyaPermissionScope;
}): Promise<boolean> {
  const grants = await readJsonl<MiyaPermissionGrant>(
    grantsPath(params.baseDir),
  );
  const latest = [...grants]
    .reverse()
    .find((entry) => entry.scope === params.scope);
  if (!latest || latest.revokedAt) return false;
  if (!latest.expiresAt) return true;
  return latest.expiresAt > Date.now();
}

export async function appendAudit(params: {
  baseDir: string;
  type: MiyaAuditEvent["type"];
  detail: string;
  metadata?: Record<string, unknown>;
}) {
  const row: MiyaAuditEvent = {
    id: randomId("audit"),
    timestamp: Date.now(),
    type: params.type,
    detail: params.detail,
    metadata: params.metadata,
  };
  await appendJsonl(auditPath(params.baseDir), row);
  return row;
}

export async function requirePermission(params: {
  baseDir: string;
  scope: MiyaPermissionScope;
  denialDetail: string;
}): Promise<boolean> {
  const ok = await hasPermission({
    baseDir: params.baseDir,
    scope: params.scope,
  });
  if (ok) return true;
  await appendAudit({
    baseDir: params.baseDir,
    type: "permission.denied",
    detail: params.denialDetail,
    metadata: { scope: params.scope },
  });
  return false;
}
