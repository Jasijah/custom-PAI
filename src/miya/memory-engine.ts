import path from "node:path";
import {
  appendJsonl,
  decryptText,
  encryptText,
  randomId,
  readJsonl,
} from "./storage.js";
import { appendAudit, requirePermission } from "./trust-center.js";
import type { MemoryLayer, MiyaMemory, PrivacyLevel } from "./types.js";

function memoryPath(baseDir: string) {
  return path.join(baseDir, "memory.jsonl");
}

export async function storeMemory(params: {
  baseDir: string;
  text: string;
  layer: MemoryLayer;
  tags?: string[];
  privacyLevel?: PrivacyLevel;
  importance?: number;
  confidence?: number;
  emotionalWeight?: number;
  expiry?: number | null;
  source?: string;
  links?: string[];
  encryptionKey?: string;
}) {
  const allowed = await requirePermission({
    baseDir: params.baseDir,
    scope: "memoryWrite",
    denialDetail: "memoryWrite blocked",
  });
  if (!allowed) return null;
  const row: MiyaMemory = {
    id: randomId("mem"),
    layer: params.layer,
    timestamp: Date.now(),
    tags: params.tags ?? [],
    privacyLevel: params.privacyLevel ?? "private",
    importance: params.importance ?? 0.5,
    confidence: params.confidence ?? 0.5,
    emotionalWeight: params.emotionalWeight ?? 0.5,
    expiry: params.expiry ?? null,
    source: params.source ?? "agent",
    text: params.text,
    textEncrypted: encryptText(params.text, params.encryptionKey),
    links: params.links,
  };
  await appendJsonl(memoryPath(params.baseDir), row);
  await appendAudit({
    baseDir: params.baseDir,
    type: "memory.write",
    detail: row.id,
    metadata: { layer: row.layer, privacy: row.privacyLevel },
  });
  return row;
}

export async function searchMemories(params: {
  baseDir: string;
  query: string;
  layers?: MemoryLayer[];
  tags?: string[];
  includeSensitive?: boolean;
  encryptionKey?: string;
}) {
  const rows = await readJsonl<MiyaMemory>(memoryPath(params.baseDir));
  const q = params.query.trim().toLowerCase();
  const now = Date.now();
  const out = rows.filter((row) => {
    if (row.expiry && row.expiry < now) return false;
    if (params.layers?.length && !params.layers.includes(row.layer))
      return false;
    if (
      params.tags?.length &&
      !params.tags.every((tag) => row.tags.includes(tag))
    ) {
      return false;
    }
    if (row.privacyLevel === "sensitive" && !params.includeSensitive)
      return false;
    if (!q) return true;
    return (
      row.text.toLowerCase().includes(q) ||
      row.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });
  return out.map((row) => ({
    ...row,
    decryptedText: row.textEncrypted
      ? (decryptText(row.textEncrypted, params.encryptionKey) ?? row.text)
      : row.text,
  }));
}

export async function retrieveRelevantMemories(params: {
  baseDir: string;
  context: string;
  limit: number;
  includeSensitive?: boolean;
  encryptionKey?: string;
}) {
  const includeSensitive = params.includeSensitive === true;
  if (includeSensitive) {
    const allowed = await requirePermission({
      baseDir: params.baseDir,
      scope: "memoryReadSensitive",
      denialDetail: "memoryReadSensitive blocked",
    });
    if (!allowed)
      return {
        items: [],
        whyRetrieved: "Sensitive read denied by permission.",
      };
  }
  const queryTerms = params.context
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
  const rows = await searchMemories({
    baseDir: params.baseDir,
    query: "",
    includeSensitive,
    encryptionKey: params.encryptionKey,
  });

  const scored = rows
    .map((row) => {
      const hits = queryTerms.filter(
        (term) =>
          row.text.toLowerCase().includes(term) ||
          row.tags.some((tag) => tag.toLowerCase().includes(term)),
      ).length;
      const recencyScore =
        1 / Math.max(1, (Date.now() - row.timestamp) / 86_400_000);
      const score =
        hits * 0.5 +
        row.importance * 0.3 +
        row.confidence * 0.2 +
        recencyScore * 0.1;
      return { row, score, hits };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(params.limit, 1));

  await appendAudit({
    baseDir: params.baseDir,
    type: "memory.read",
    detail: `retrieved ${scored.length}`,
    metadata: { context: params.context.slice(0, 120) },
  });

  const why = scored.length
    ? `Matched tags/terms and recency (top terms: ${queryTerms.slice(0, 4).join(", ") || "none"}).`
    : "No relevant memories matched context.";

  return { items: scored.map((entry) => entry.row), whyRetrieved: why };
}
