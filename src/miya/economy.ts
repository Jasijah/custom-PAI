import path from "node:path";
import { appendJsonl, randomId, readJsonl } from "./storage.js";
import type { MiyaLedgerEntry } from "./types.js";

function ledgerPath(baseDir: string) {
  return path.join(baseDir, "ledger.jsonl");
}

export async function recordLedgerEntry(params: {
  baseDir: string;
  type: "earn" | "spend";
  amount: number;
  agent: string;
  reason: string;
  correlationId?: string;
}) {
  const row: MiyaLedgerEntry = {
    id: randomId("ledger"),
    timestamp: Date.now(),
    type: params.type,
    amount: params.amount,
    agent: params.agent,
    reason: params.reason,
    correlationId: params.correlationId,
  };
  await appendJsonl(ledgerPath(params.baseDir), row);
  return row;
}

export async function getDailySpend(baseDir: string): Promise<number> {
  const rows = await readJsonl<MiyaLedgerEntry>(ledgerPath(baseDir));
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return rows
    .filter((row) => row.timestamp >= start.getTime() && row.type === "spend")
    .reduce((sum, row) => sum + row.amount, 0);
}
