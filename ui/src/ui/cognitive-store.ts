export type PermissionScope =
  | "calendar.read"
  | "suggestions"
  | "messages.send"
  | "purchases"
  | "mic"
  | "tts";

export type GrantDuration = "15m" | "1h" | "1d" | "30d" | "forever";

export type PermissionGrant = {
  scope: PermissionScope;
  enabled: boolean;
  duration: GrantDuration;
  grantedAt: number | null;
  expiresAt: number | null;
};

export type AuditEventKind =
  | "memory.read"
  | "memory.write"
  | "agent.run"
  | "suggestion.created"
  | "action.executed"
  | "stt.used"
  | "tts.used";

export type AuditEvent = {
  id: string;
  ts: number;
  kind: AuditEventKind;
  detail: string;
};

export type MemoryLayer = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";
export type PrivacyLevel = "low" | "medium" | "high";

export type MemoryItem = {
  id: string;
  title: string;
  body: string;
  layer: MemoryLayer;
  timestamp: number;
  tags: string[];
  privacy: PrivacyLevel;
  importance: number;
  confidence: number;
  emotionalWeight: number;
  retentionUntil: number | null;
  source: string;
  encryptedPayload?: string;
};

export type SuggestionStatus = "new" | "accepted" | "scheduled" | "dismissed";

export type Reflection = {
  ts: number;
  done: boolean;
  usefulness: number;
  obstacle: string;
};

export type ActionCard = {
  id: string;
  title: string;
  rationale: string;
  confidence: number;
  relatedMemoryIds: string[];
  whyRetrieved: string;
  createdAt: number;
  status: SuggestionStatus;
  scheduledFor: number | null;
  reflection: Reflection | null;
};

export type AgentSuggestion = {
  id: string;
  agent: string;
  title: string;
  confidence: number;
  relatedMemoryIds: string[];
  blockedBy?: PermissionScope;
};

export type VoicePrefs = {
  autoRead: boolean;
  announceOnline: boolean;
  provider: "nvidia" | "browser";
  voiceURI: string;
  nvidiaVoice: string;
  rate: number;
  pitch: number;
};

export type EconomyState = {
  dailyBudget: number;
  allocations: Record<string, number>;
  ledger: Array<{ id: string; ts: number; type: "spend" | "earn"; amount: number; note: string }>;
};

export type WellbeingState = {
  cognitiveLoad: number;
  wellbeing: number;
};

export type CognitiveState = {
  permissions: PermissionGrant[];
  auditLog: AuditEvent[];
  memory: MemoryItem[];
  actions: ActionCard[];
  agentSuggestions: AgentSuggestion[];
  voice: VoicePrefs;
  economy: EconomyState;
  wellbeing: WellbeingState;
};

const KEY = "clawdis.control.cognitive.v1";
const encoder = new TextEncoder();

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function durationToMs(duration: GrantDuration): number | null {
  switch (duration) {
    case "15m":
      return 15 * 60 * 1000;
    case "1h":
      return 60 * 60 * 1000;
    case "1d":
      return 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
    case "forever":
      return null;
  }
}

const defaultPermissions: PermissionGrant[] = [
  "calendar.read",
  "suggestions",
  "messages.send",
  "purchases",
  "mic",
  "tts",
].map((scope) => ({
  scope,
  enabled: false,
  duration: "1h" as GrantDuration,
  grantedAt: null,
  expiresAt: null,
}));

export function loadCognitiveState(): CognitiveState {
  const defaults: CognitiveState = {
    permissions: defaultPermissions,
    auditLog: [],
    memory: [],
    actions: [],
    agentSuggestions: [],
    voice: {
      autoRead: false,
      announceOnline: true,
      provider: "nvidia",
      voiceURI: "",
      nvidiaVoice: "alloy",
      rate: 1,
      pitch: 1,
    },
    economy: {
      dailyBudget: 100,
      allocations: {
        memory: 15,
        identity: 15,
        emotion: 10,
        life: 20,
        finance: 10,
        growth: 10,
        network: 10,
        automation: 10,
      },
      ledger: [],
    },
    wellbeing: { cognitiveLoad: 50, wellbeing: 50 },
  };

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<CognitiveState>;
    return {
      ...defaults,
      ...parsed,
      permissions: parsed.permissions?.length ? parsed.permissions : defaults.permissions,
      auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : [],
      memory: Array.isArray(parsed.memory) ? parsed.memory : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      agentSuggestions: Array.isArray(parsed.agentSuggestions) ? parsed.agentSuggestions : [],
      voice: { ...defaults.voice, ...(parsed.voice ?? {}) },
      economy: {
        ...defaults.economy,
        ...(parsed.economy ?? {}),
        allocations: { ...defaults.economy.allocations, ...(parsed.economy?.allocations ?? {}) },
        ledger: Array.isArray(parsed.economy?.ledger) ? parsed.economy.ledger : [],
      },
      wellbeing: { ...defaults.wellbeing, ...(parsed.wellbeing ?? {}) },
    };
  } catch {
    return defaults;
  }
}

export function saveCognitiveState(state: CognitiveState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function permissionEnabled(state: CognitiveState, scope: PermissionScope): boolean {
  const row = state.permissions.find((entry) => entry.scope === scope);
  if (!row || !row.enabled) return false;
  if (!row.expiresAt) return true;
  return Date.now() <= row.expiresAt;
}

export function updatePermission(
  state: CognitiveState,
  scope: PermissionScope,
  enabled: boolean,
  duration: GrantDuration,
): CognitiveState {
  const now = Date.now();
  const durMs = durationToMs(duration);
  const expiresAt = enabled ? (durMs == null ? null : now + durMs) : null;
  const permissions = state.permissions.map((entry) =>
    entry.scope === scope
      ? { ...entry, enabled, duration, grantedAt: enabled ? now : null, expiresAt }
      : entry,
  );
  return { ...state, permissions };
}

export function appendAudit(state: CognitiveState, kind: AuditEventKind, detail: string): CognitiveState {
  const next = [{ id: id("audit"), ts: Date.now(), kind, detail }, ...state.auditLog].slice(0, 400);
  return { ...state, auditLog: next };
}

function encryptIfPossible(input: string): string {
  const secret = (import.meta.env.VITE_MEMORY_SECRET as string | undefined)?.trim();
  if (!secret) return "";
  const bytes = encoder.encode(`${secret}:${input}`);
  return btoa(String.fromCharCode(...bytes));
}

export function createMemory(state: CognitiveState, input: Omit<MemoryItem, "id" | "timestamp" | "encryptedPayload">): CognitiveState {
  const encryptedPayload = input.privacy === "high" ? encryptIfPossible(input.body) : "";
  const item: MemoryItem = {
    ...input,
    id: id("mem"),
    timestamp: Date.now(),
    encryptedPayload,
  };
  return appendAudit({ ...state, memory: [item, ...state.memory] }, "memory.write", `memory:${item.id}`);
}

export function searchMemory(state: CognitiveState, q: string): MemoryItem[] {
  const query = q.trim().toLowerCase();
  if (!query) return state.memory;
  return state.memory.filter((item) => {
    const hay = `${item.title} ${item.body} ${item.tags.join(" ")}`.toLowerCase();
    return hay.includes(query);
  });
}

export function createActionCard(state: CognitiveState, seed: string): CognitiveState {
  if (!permissionEnabled(state, "suggestions")) {
    return appendAudit(state, "agent.run", "suggestions blocked by permission");
  }
  const topMemory = state.memory.slice(0, 2);
  const card: ActionCard = {
    id: id("act"),
    title: `Miya Loop: ${seed.slice(0, 50) || "Review current priorities"}`,
    rationale: "Generated from recent context + accepted actions",
    confidence: Math.max(0.4, Math.min(0.95, 0.6 + topMemory.length * 0.1)),
    relatedMemoryIds: topMemory.map((m) => m.id),
    whyRetrieved: topMemory.length
      ? `Matched recency and tags from ${topMemory.map((m) => m.title).join(", ")}`
      : "No memory matches; using recency-only heuristic",
    createdAt: Date.now(),
    status: "new",
    scheduledFor: null,
    reflection: null,
  };
  return appendAudit({ ...state, actions: [card, ...state.actions] }, "suggestion.created", card.id);
}

export function updateAction(
  state: CognitiveState,
  cardId: string,
  status: SuggestionStatus,
  scheduledFor: number | null,
): CognitiveState {
  const actions = state.actions.map((card) =>
    card.id === cardId ? { ...card, status, scheduledFor } : card,
  );
  return appendAudit({ ...state, actions }, "action.executed", `${cardId}:${status}`);
}

export function reflectAction(
  state: CognitiveState,
  cardId: string,
  reflection: Reflection,
): CognitiveState {
  const actions = state.actions.map((card) =>
    card.id === cardId ? { ...card, reflection } : card,
  );
  return appendAudit({ ...state, actions }, "action.executed", `${cardId}:reflection`);
}

const AGENT_REGISTRY = [
  "Memory", "Identity", "Emotion/State", "Life OS", "Finance", "Skill/Growth", "Relationship/Network", "Automation", "Digital Trust Guardian", "Strategic Advisor", "Personal Economy Manager",
];

export function runAgents(state: CognitiveState): CognitiveState {
  const suggestions: AgentSuggestion[] = AGENT_REGISTRY.map((agent) => {
    const needsFinance = agent.includes("Finance") || agent.includes("Economy");
    const blockedBy = needsFinance && !permissionEnabled(state, "purchases") ? "purchases" : undefined;
    const mem = state.memory[0];
    return {
      id: id("agent"),
      agent,
      title: blockedBy
        ? `${agent} is limited until '${blockedBy}' is granted`
        : `${agent}: ${mem ? `build on “${mem.title}”` : "create next best action"}`,
      confidence: blockedBy ? 0.2 : mem ? 0.78 : 0.55,
      relatedMemoryIds: mem ? [mem.id] : [],
      blockedBy,
    };
  });
  return appendAudit({ ...state, agentSuggestions: suggestions }, "agent.run", "agent-stack:mvp");
}
