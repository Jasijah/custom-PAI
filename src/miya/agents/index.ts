import { scoreAdjustment } from "../cognitive-loop.js";
import { getDailySpend, recordLedgerEntry } from "../economy.js";
import { retrieveRelevantMemories } from "../memory-engine.js";
import { appendAudit, requirePermission } from "../trust-center.js";
import type { MiyaSuggestion } from "../types.js";

const AGENT_NAMES = [
  "MemoryAgent",
  "IdentityAgent",
  "EmotionStateAgent",
  "LifeOSAgent",
  "FinanceAgent",
  "GrowthAgent",
  "RelationshipNetworkAgent",
  "AutomationAgent",
  "TrustGuardianAgent",
  "StrategicAdvisorAgent",
  "PersonalEconomyAgent",
] as const;

export async function runMiyaAgents(params: {
  baseDir: string;
  contextText: string;
  encryptionKey?: string;
}): Promise<MiyaSuggestion[]> {
  const allowSuggestions = await requirePermission({
    baseDir: params.baseDir,
    scope: "suggestions",
    denialDetail: "agent suggestions blocked",
  });
  if (!allowSuggestions) return [];

  const memoryResult = await retrieveRelevantMemories({
    baseDir: params.baseDir,
    context: params.contextText,
    limit: 4,
    includeSensitive: false,
    encryptionKey: params.encryptionKey,
  });

  const tags = memoryResult.items.flatMap((item) => item.tags).slice(0, 6);
  const linkedMemoryIds = memoryResult.items.map((item) => item.id);
  const suggestions: MiyaSuggestion[] = [];

  for (const agent of AGENT_NAMES) {
    const baseConfidence =
      agent === "TrustGuardianAgent"
        ? 0.72
        : agent === "PersonalEconomyAgent"
          ? 0.66
          : 0.61;
    const adjust = await scoreAdjustment({
      baseDir: params.baseDir,
      agent,
      tags,
    });
    const confidence = Math.max(0.25, Math.min(0.96, baseConfidence + adjust));

    suggestions.push({
      id: `${agent}-${Date.now()}`,
      agent,
      title: `${agent}: suggest next best action`,
      rationale:
        linkedMemoryIds.length > 0
          ? `Uses relevant memory traces from ${linkedMemoryIds.slice(0, 2).join(", ")}.`
          : "Uses recency-only heuristic (no memory matches).",
      confidence,
      linkedMemoryIds,
      whyRetrieved: memoryResult.whyRetrieved,
    });

    await recordLedgerEntry({
      baseDir: params.baseDir,
      type: "spend",
      amount: agent === "StrategicAdvisorAgent" ? 3 : 1,
      agent,
      reason: "suggestion_generation",
      correlationId: suggestions[suggestions.length - 1]?.id,
    });
  }

  const spend = await getDailySpend(params.baseDir);
  await appendAudit({
    baseDir: params.baseDir,
    type: "agent.run",
    detail: `generated ${suggestions.length} suggestions`,
    metadata: { dailySpend: spend },
  });

  return suggestions;
}
