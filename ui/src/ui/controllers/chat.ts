import type { GatewayBrowserClient } from "../gateway";
import { generateUUID } from "../uuid";

export type ChatState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  sessionKey: string;
  chatLoading: boolean;
  chatMessages: unknown[];
  chatThinkingLevel: string | null;
  chatSending: boolean;
  chatMessage: string;
  chatRunId: string | null;
  chatStream: string | null;
  lastError: string | null;
};

export type ChatEventPayload = {
  runId: string;
  sessionKey: string;
  state: "delta" | "final" | "aborted" | "error";
  message?: unknown;
  errorMessage?: string;
};

const THINKING_BLOCK_RE = /<thinking>[\s\S]*?<\/thinking>/gi;
const THINKING_TAG_RE = /<\/?thinking>/gi;

function cleanChatText(text: string): string {
  return text
    .replace(THINKING_BLOCK_RE, "")
    .replace(THINKING_TAG_RE, "")
    .trim();
}

function extractVisibleText(message: unknown): string | null {
  const m = message as Record<string, unknown>;
  const content = m.content;
  if (typeof content === "string") {
    const cleaned = cleanChatText(content);
    return cleaned || null;
  }
  if (Array.isArray(content)) {
    const parts = content
      .map((p) => {
        const item = p as Record<string, unknown>;
        if (item.type === "text" && typeof item.text === "string") {
          const cleaned = cleanChatText(item.text);
          return cleaned || null;
        }
        return null;
      })
      .filter((v): v is string => typeof v === "string" && v.length > 0);
    if (parts.length > 0) return parts.join("\n");
  }
  if (typeof m.text === "string") {
    const cleaned = cleanChatText(m.text);
    return cleaned || null;
  }
  return null;
}

function hasVisibleToolCards(message: unknown): boolean {
  const m = message as Record<string, unknown>;
  const content = Array.isArray(m.content) ? m.content : [];
  return content.some((entry) => {
    const item = entry as Record<string, unknown>;
    const type = typeof item.type === "string" ? item.type.toLowerCase() : "";
    return (
      type === "toolcall" ||
      type === "tool_call" ||
      type === "toolresult" ||
      type === "tool_result" ||
      type === "tooluse" ||
      type === "tool_use"
    );
  });
}

function shouldKeepHistoryMessage(message: unknown): boolean {
  const m = message as Record<string, unknown>;
  const role = typeof m.role === "string" ? m.role.toLowerCase() : "";
  if (role === "toolresult" || role === "tool_result") return false;
  const text = extractVisibleText(message);
  if (text) return true;
  return hasVisibleToolCards(message);
}

function normalizeHistoryMessage(message: unknown): unknown {
  const m = message as Record<string, unknown>;
  const text = extractVisibleText(message);
  if (!text) return message;
  return {
    ...m,
    content: [{ type: "text", text }],
  };
}

function formatChatErrorMessage(error: unknown): string {
  const raw = String(error ?? "").trim();
  if (!raw) return "Miya ran into an error while replying.";
  const normalized = raw.toLowerCase();
  if (
    normalized.includes("quota exceeded") ||
    normalized.includes("resource_exhausted") ||
    normalized.includes("too many requests") ||
    normalized.includes("generate_content_free_tier_requests")
  ) {
    const retryMatch =
      raw.match(/retry in\s+([0-9.]+)s/i) ??
      raw.match(/"retryDelay"\s*:\s*"([0-9]+)s"/i);
    const retry = retryMatch?.[1] ? `${retryMatch[1]} seconds` : "a short while";
    return `Gemini is temporarily rate-limited right now. Please wait ${retry} and send the message again.`;
  }
  return raw.length > 220 ? `${raw.slice(0, 219)}…` : raw;
}

export async function loadChatHistory(state: ChatState) {
  if (!state.client || !state.connected) return;
  state.chatLoading = true;
  state.lastError = null;
  try {
    const res = (await state.client.request("chat.history", {
      sessionKey: state.sessionKey,
      limit: 200,
    })) as { messages?: unknown[]; thinkingLevel?: string | null };
    state.chatMessages = Array.isArray(res.messages)
      ? res.messages.filter(shouldKeepHistoryMessage).map(normalizeHistoryMessage)
      : [];
    state.chatThinkingLevel = res.thinkingLevel ?? null;
  } catch (err) {
    state.lastError = formatChatErrorMessage(err);
  } finally {
    state.chatLoading = false;
  }
}

export async function sendChat(
  state: ChatState,
  extraSystemPrompt?: string,
) {
  if (!state.client || !state.connected) return;
  const msg = state.chatMessage.trim();
  if (!msg) return;

  state.chatSending = true;
  state.chatMessage = "";
  state.lastError = null;
  const runId = generateUUID();
  state.chatRunId = runId;
  state.chatStream = "";
  try {
    await state.client.request("chat.send", {
      sessionKey: state.sessionKey,
      message: msg,
      extraSystemPrompt,
      deliver: false,
      idempotencyKey: runId,
    });
  } catch (err) {
    state.chatRunId = null;
    state.chatStream = null;
    state.chatMessage = msg;
    state.lastError = formatChatErrorMessage(err);
  } finally {
    state.chatSending = false;
  }
}

export function handleChatEvent(
  state: ChatState,
  payload?: ChatEventPayload,
) {
  if (!payload) return null;
  if (payload.sessionKey !== state.sessionKey) return null;
  if (payload.runId && state.chatRunId && payload.runId !== state.chatRunId)
    return null;

  if (payload.state === "delta") {
    state.chatStream = extractText(payload.message) ?? state.chatStream;
  } else if (payload.state === "final") {
    state.chatStream = null;
    state.chatRunId = null;
  } else if (payload.state === "error") {
    state.chatStream = null;
    state.chatRunId = null;
    state.lastError = formatChatErrorMessage(payload.errorMessage ?? "chat error");
  }
  return payload.state;
}

function extractText(message: unknown): string | null {
  const m = message as Record<string, unknown>;
  const content = m.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts = content
      .map((p) => {
        const item = p as Record<string, unknown>;
        if (item.type === "text" && typeof item.text === "string") return item.text;
        return null;
      })
      .filter((v): v is string => typeof v === "string");
    if (parts.length > 0) return parts.join("\n");
  }
  if (typeof m.text === "string") return m.text;
  return null;
}
