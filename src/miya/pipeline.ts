import { runMiyaAgents } from "./agents/index.js";
import { createActionCard } from "./cognitive-loop.js";
import { isMiyaEnabled, resolveMiyaBaseDir } from "./config.js";
import { storeMemory } from "./memory-engine.js";
import { ensureMiyaOnboarding } from "./onboarding.js";
import { appendAudit } from "./trust-center.js";
import type { MiyaActionCard, MiyaMemory, MiyaSuggestion } from "./types.js";

export async function miyaPostRunPipeline(params: {
  sessionId: string;
  workspaceDir: string;
  userText: string;
  assistantText: string;
  timestamp: number;
  encryptionKey?: string;
}): Promise<{
  enabled: boolean;
  memory: MiyaMemory[];
  suggestions: MiyaSuggestion[];
  actionCards: MiyaActionCard[];
}> {
  if (!isMiyaEnabled()) {
    return { enabled: false, memory: [], suggestions: [], actionCards: [] };
  }
  const baseDir = resolveMiyaBaseDir(params.workspaceDir);
  await ensureMiyaOnboarding({ baseDir });

  const extracted: Array<{ text: string; tags: string[]; confidence: number }> =
    [];
  const user = params.userText.trim();
  if (user.length > 12) {
    extracted.push({
      text: `User intent: ${user}`,
      tags: ["intent", "session"],
      confidence: 0.45,
    });
  }
  if (/\b(prefer|like|always|never|goal|plan)\b/i.test(user)) {
    extracted.push({
      text: `User preference/commitment candidate: ${user}`,
      tags: ["preference", "reversible"],
      confidence: 0.38,
    });
  }

  const memory: MiyaMemory[] = [];
  for (const item of extracted) {
    const row = await storeMemory({
      baseDir,
      text: item.text,
      layer: "L1",
      tags: item.tags,
      privacyLevel: "private",
      confidence: item.confidence,
      importance: 0.5,
      emotionalWeight: 0.5,
      source: `agent:${params.sessionId}`,
      encryptionKey: params.encryptionKey,
    });
    if (row) memory.push(row);
  }

  const contextText = `${params.userText}\n${params.assistantText}`;
  const suggestions = await runMiyaAgents({
    baseDir,
    contextText,
    encryptionKey: params.encryptionKey,
  });

  const actionCards: MiyaActionCard[] = [];
  for (const suggestion of suggestions.slice(0, 5)) {
    const row = await createActionCard({
      baseDir,
      agent: suggestion.agent,
      title: suggestion.title,
      rationale: suggestion.rationale,
      confidence: suggestion.confidence,
      linkedMemoryIds: suggestion.linkedMemoryIds,
      whyRetrieved: suggestion.whyRetrieved,
    });
    if (row) actionCards.push(row);
  }

  await appendAudit({
    baseDir,
    type: "agent.run",
    detail: `miya pipeline completed for ${params.sessionId}`,
    metadata: {
      memories: memory.length,
      suggestions: suggestions.length,
      actionCards: actionCards.length,
    },
  });

  return {
    enabled: true,
    memory,
    suggestions,
    actionCards,
  };
}
