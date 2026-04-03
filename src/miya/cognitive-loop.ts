import path from "node:path";
import { appendJsonl, randomId, readJsonl } from "./storage.js";
import { appendAudit, requirePermission } from "./trust-center.js";
import type { MiyaActionCard, MiyaOutcome } from "./types.js";

function actionsPath(baseDir: string) {
  return path.join(baseDir, "actions.jsonl");
}

function outcomesPath(baseDir: string) {
  return path.join(baseDir, "outcomes.jsonl");
}

export async function createActionCard(params: {
  baseDir: string;
  agent: string;
  title: string;
  rationale: string;
  confidence: number;
  linkedMemoryIds: string[];
  whyRetrieved: string;
}) {
  const allowed = await requirePermission({
    baseDir: params.baseDir,
    scope: "suggestions",
    denialDetail: "suggestions blocked",
  });
  if (!allowed) return null;
  const row: MiyaActionCard = {
    id: randomId("action"),
    createdAt: Date.now(),
    agent: params.agent,
    title: params.title,
    rationale: params.rationale,
    confidence: params.confidence,
    linkedMemoryIds: params.linkedMemoryIds,
    whyRetrieved: params.whyRetrieved,
    status: "proposed",
  };
  await appendJsonl(actionsPath(params.baseDir), row);
  await appendAudit({
    baseDir: params.baseDir,
    type: "suggestion.create",
    detail: row.id,
    metadata: { agent: row.agent, confidence: row.confidence },
  });
  return row;
}

export async function recordOutcome(params: {
  baseDir: string;
  actionId: string;
  completed: boolean;
  helpfulness: number;
  obstacleNote?: string;
  improvementNote?: string;
}) {
  const row: MiyaOutcome = {
    actionId: params.actionId,
    completed: params.completed,
    helpfulness: Math.max(1, Math.min(5, Math.round(params.helpfulness))),
    obstacleNote: params.obstacleNote,
    improvementNote: params.improvementNote,
    timestamp: Date.now(),
  };
  await appendJsonl(outcomesPath(params.baseDir), row);
  await appendAudit({
    baseDir: params.baseDir,
    type: "action.update",
    detail: params.actionId,
    metadata: { completed: row.completed, helpfulness: row.helpfulness },
  });
  return row;
}

export async function scoreAdjustment(params: {
  baseDir: string;
  agent: string;
  tags: string[];
}) {
  const outcomes = await readJsonl<MiyaOutcome>(outcomesPath(params.baseDir));
  const actions = await readJsonl<MiyaActionCard>(actionsPath(params.baseDir));
  const byId = new Map(actions.map((action) => [action.id, action]));
  let delta = 0;
  for (const outcome of outcomes) {
    const action = byId.get(outcome.actionId);
    if (!action) continue;
    if (action.agent !== params.agent) continue;
    const overlapping = params.tags.filter((tag) =>
      action.whyRetrieved.includes(tag),
    );
    if (overlapping.length === 0) continue;
    if (outcome.completed && outcome.helpfulness >= 4) delta += 0.08;
    if (!outcome.completed || outcome.helpfulness <= 2) delta -= 0.1;
  }
  return Math.max(-0.25, Math.min(0.25, delta));
}
