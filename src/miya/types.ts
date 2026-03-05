export type MemoryLayer = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";
export type PrivacyLevel = "public" | "private" | "sensitive";

export type MiyaMemory = {
  id: string;
  layer: MemoryLayer;
  timestamp: number;
  tags: string[];
  privacyLevel: PrivacyLevel;
  importance: number;
  confidence: number;
  emotionalWeight: number;
  expiry: number | null;
  source: string;
  text: string;
  textEncrypted?: string;
  links?: string[];
};

export type ActionStatus =
  | "proposed"
  | "accepted"
  | "scheduled"
  | "dismissed"
  | "done";

export type MiyaActionCard = {
  id: string;
  createdAt: number;
  agent: string;
  title: string;
  rationale: string;
  confidence: number;
  linkedMemoryIds: string[];
  whyRetrieved: string;
  status: ActionStatus;
  scheduleTime?: number;
};

export type MiyaOutcome = {
  actionId: string;
  completed: boolean;
  helpfulness: number;
  obstacleNote?: string;
  improvementNote?: string;
  timestamp: number;
};

export type MiyaPermissionScope =
  | "suggestions"
  | "memoryWrite"
  | "memoryReadSensitive"
  | "mic"
  | "tts"
  | "calendarReadDemo"
  | "sendMessagesDemo"
  | "purchasesDemo";

export type MiyaPermissionGrant = {
  scope: MiyaPermissionScope;
  grantedAt: number;
  expiresAt: number | null;
  revokedAt: number | null;
  grantSource: string;
  device?: string;
};

export type MiyaAuditEvent = {
  id: string;
  timestamp: number;
  type:
    | "memory.read"
    | "memory.write"
    | "agent.run"
    | "suggestion.create"
    | "action.update"
    | "stt.use"
    | "tts.use"
    | "permission.denied";
  detail: string;
  metadata?: Record<string, unknown>;
};

export type MiyaLedgerEntry = {
  id: string;
  timestamp: number;
  type: "earn" | "spend";
  amount: number;
  agent: string;
  reason: string;
  correlationId?: string;
};

export type MiyaSuggestion = {
  id: string;
  agent: string;
  title: string;
  rationale: string;
  confidence: number;
  linkedMemoryIds: string[];
  whyRetrieved: string;
};
