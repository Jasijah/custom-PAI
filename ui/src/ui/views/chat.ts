import { html, nothing } from "lit";

import type { EventLogEntry } from "../app-render";
import type { ActionCard, VoicePrefs } from "../cognitive-store";
import type { ProvidersStatusSnapshot, SessionsListResult } from "../types";
import { formatToolDetail, resolveToolDisplay } from "../tool-display";

export type ChatProps = {
  assistantName: string;
  callMe: string;
  sessionKey: string;
  onSessionKeyChange: (next: string) => void;
  thinkingLevel: string | null;
  loading: boolean;
  sending: boolean;
  messages: unknown[];
  stream: string | null;
  draft: string;
  connected: boolean;
  canSend: boolean;
  disabledReason: string | null;
  sessions: SessionsListResult | null;
  eventLog: EventLogEntry[];
  providersSnapshot: ProvidersStatusSnapshot | null;
  onRefresh: () => void;
  onDraftChange: (next: string) => void;
  onSend: () => void;
  actionCards: ActionCard[];
  voice: VoicePrefs;
  voiceSupported: boolean;
  voiceListening: boolean;
  onVoiceChange: (next: Partial<VoicePrefs>) => void;
  onVoiceStart: () => void;
  onVoiceStop: () => void;
  onReadAloud: (text: string) => void;
  onAction: (id: string, mode: "accepted" | "scheduled" | "dismissed") => void;
  onReflect: (id: string, done: boolean, usefulness: number, obstacle: string) => void;
};

export function renderChat(props: ChatProps) {
  const canInteract = props.connected;
  const canCompose = props.canSend && !props.sending;
  const sessionOptions = resolveSessionOptions(props.sessionKey, props.sessions);
  const recentSessions = sessionOptions.slice(0, 6);
  const inspectorEvents = props.eventLog.filter((entry) => entry.event === "chat").slice(0, 4);
  const composePlaceholder = (() => {
    if (!props.connected) return "Connect to your gateway to begin.";
    if (!props.canSend) return "Connect a mobile node to unlock talk and voice.";
    return `Ask anything, plan your day, or tell ${props.assistantName} what matters.`;
  })();
  const quickPrompts = [
    "Help me plan today",
    "Summarize what changed recently",
    "Create three next steps for my project",
    "Check whether Gemini is still connected",
  ];
  const geminiConnected = Boolean(props.connected && props.providersSnapshot);

  return html`
    <section class="chat-layout">
      <aside class="chat-rail">
        <div class="chat-rail__header">
          <div>
            <div class="section-title">Conversations</div>
            <div class="section-sub">Jump between recent threads without leaving the page.</div>
          </div>
          <button class="btn" ?disabled=${props.loading || !canInteract} @click=${props.onRefresh}>
            ${props.loading ? "Loading..." : "Refresh"}
          </button>
        </div>
        <div class="chat-session-list">
          ${recentSessions.map(
            (entry) => html`
              <button
                class="chat-session-card ${entry.key === props.sessionKey ? "active" : ""}"
                @click=${() => props.onSessionKeyChange(entry.key)}
              >
                <span class="chat-session-card__title">${entry.displayName ?? entry.key}</span>
                <span class="chat-session-card__sub">${entry.updatedAt ? formatSessionTime(entry.updatedAt) : "Ready to use"}</span>
              </button>
            `,
          )}
        </div>
      </aside>

      <div class="card chat chat-main">
        <div class="chat-header">
          <div class="chat-header__left">
            <label class="field chat-session">
              <span>Current conversation</span>
              <select
                .value=${props.sessionKey}
                ?disabled=${!canInteract}
                @change=${(e: Event) =>
                  props.onSessionKeyChange((e.target as HTMLSelectElement).value)}
              >
                ${sessionOptions.map(
                  (entry) =>
                    html`<option value=${entry.key}>
                      ${entry.displayName ?? entry.key}
                    </option>`,
                )}
              </select>
            </label>
          </div>
          <div class="chat-header__right">
            <div class="chat-health">
              <span class="statusDot ${geminiConnected ? "ok" : ""}"></span>
              <span>${props.connected ? `${props.assistantName} is ready` : "Offline"}</span>
            </div>
            <div class="muted">Thinking: ${props.thinkingLevel ?? "balanced"}</div>
          </div>
        </div>

        ${props.disabledReason
          ? html`<div class="callout" style="margin-top: 12px;">
              ${props.disabledReason}
            </div>`
          : nothing}

        <div class="chat-chips">
          ${quickPrompts.map(
            (prompt) => html`
              <button class="chip action" @click=${() => props.onDraftChange(prompt)}>${prompt}</button>
            `,
          )}
        </div>

        ${props.actionCards.length
          ? html`<div class="action-strip">
              ${props.actionCards.map(
                (card) => html`
                  <div class="action-strip__item">
                    <div>
                      <div class="action-strip__title">${card.title}</div>
                      <div class="action-strip__sub">${card.whyRetrieved}</div>
                    </div>
                    <div class="row">
                      <button class="btn primary" @click=${() => props.onAction(card.id, "accepted")}>Keep</button>
                      <button class="btn" @click=${() => props.onAction(card.id, "scheduled")}>Later</button>
                    </div>
                  </div>
                `,
              )}
            </div>`
          : nothing}

        <div class="chat-body">
          <div class="chat-thread" role="log" aria-live="polite">
            ${props.loading ? html`<div class="muted">Loading chat...</div>` : nothing}
            ${props.messages.map((m) =>
              renderMessage(m, {
                onReadAloud: props.onReadAloud,
                assistantName: props.assistantName,
                callMe: props.callMe,
              }),
            )}
            ${props.stream
              ? renderMessage(
                  {
                    role: "assistant",
                    content: [{ type: "text", text: props.stream }],
                    timestamp: Date.now(),
                  },
                  {
                    streaming: true,
                    onReadAloud: props.onReadAloud,
                    assistantName: props.assistantName,
                    callMe: props.callMe,
                  },
                )
              : nothing}
          </div>

          <aside class="chat-inspector">
            <div class="chat-inspector__section">
              <div class="section-title">Live status</div>
              <div class="stat-grid compact">
                <div class="stat">
                  <div class="stat-label">Streaming</div>
                  <div class="stat-value">${props.stream ? "Live" : "Idle"}</div>
                </div>
                <div class="stat">
                  <div class="stat-label">Voice</div>
                  <div class="stat-value">${props.voiceListening ? "Listening" : "Ready"}</div>
                </div>
              </div>
            </div>
            <div class="chat-inspector__section">
              <div class="section-title">Recent stream events</div>
              <div class="timeline compact">
                ${inspectorEvents.length
                  ? inspectorEvents.map(
                      (entry) => html`
                        <div class="timeline-item">
                          <div class="timeline-item__dot"></div>
                          <div class="timeline-item__body">
                            <div class="timeline-item__title">${new Date(entry.ts).toLocaleTimeString()}</div>
                            <div class="timeline-item__sub">${entry.event}</div>
                          </div>
                        </div>
                      `,
                    )
                  : html`<div class="muted">The stream inspector will populate during active replies.</div>`}
              </div>
            </div>
          </aside>
        </div>

        <div class="chat-compose">
          <label class="field chat-compose__field">
            <span>Message</span>
            <textarea
              .value=${props.draft}
              ?disabled=${!props.canSend}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key !== "Enter") return;
                if (!e.metaKey && !e.ctrlKey) return;
                e.preventDefault();
                if (canCompose) props.onSend();
              }}
              @input=${(e: Event) =>
                props.onDraftChange((e.target as HTMLTextAreaElement).value)}
              placeholder=${composePlaceholder}
            ></textarea>
          </label>
          <div class="chat-compose__toolbar">
            <button class="btn" ?disabled=${!props.voiceSupported} @click=${props.voiceListening ? props.onVoiceStop : props.onVoiceStart}>${props.voiceListening ? "Stop mic" : "Use mic"}</button>
            <label class="row muted"><input type="checkbox" .checked=${props.voice.autoRead} @change=${(e: Event) => props.onVoiceChange({ autoRead: (e.target as HTMLInputElement).checked })}/>Read replies aloud</label>
            <label class="row muted"><input type="checkbox" .checked=${props.voice.announceOnline} @change=${(e: Event) => props.onVoiceChange({ announceOnline: (e.target as HTMLInputElement).checked })}/>Announce when ready</label>
            <label class="field compact">
              <span>Voice</span>
              <select .value=${props.voice.provider} @change=${(e: Event) => props.onVoiceChange({ provider: (e.target as HTMLSelectElement).value as VoicePrefs["provider"] })}>
                <option value="nvidia">NVIDIA Voice LLM</option>
                <option value="browser">Browser</option>
              </select>
            </label>
            <button
              class="btn primary"
              ?disabled=${!props.canSend || props.sending}
              @click=${props.onSend}
            >
              ${props.sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

type SessionOption = {
  key: string;
  updatedAt?: number | null;
  displayName?: string;
};

function resolveSessionOptions(
  currentKey: string,
  sessions: SessionsListResult | null,
) {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  const entries = Array.isArray(sessions?.sessions) ? sessions?.sessions ?? [] : [];
  const sorted = [...entries].sort(
    (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
  );
  const recent: SessionOption[] = [];
  const seen = new Set<string>();
  for (const entry of sorted) {
    if (seen.has(entry.key)) continue;
    seen.add(entry.key);
    if ((entry.updatedAt ?? 0) < cutoff) continue;
    recent.push(entry);
  }

  const result: SessionOption[] = [];
  const included = new Set<string>();
  const mainKey = "main";
  const mainEntry = sorted.find((entry) => entry.key === mainKey);
  if (mainEntry) {
    result.push(mainEntry);
    included.add(mainKey);
  } else if (currentKey === mainKey) {
    result.push({ key: mainKey, updatedAt: null });
    included.add(mainKey);
  }

  for (const entry of recent) {
    if (included.has(entry.key)) continue;
    result.push(entry);
    included.add(entry.key);
  }

  if (!included.has(currentKey)) {
    result.push({ key: currentKey, updatedAt: null });
  }

  return result;
}

function formatSessionTime(updatedAt: number) {
  return new Date(updatedAt).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderMessage(
  message: unknown,
  opts?: {
    streaming?: boolean;
    onReadAloud?: (text: string) => void;
    assistantName?: string;
    callMe?: string;
  },
) {
  const m = message as Record<string, unknown>;
  const role = typeof m.role === "string" ? m.role : "unknown";
  const toolCards = extractToolCards(message);
  const isToolResult = isToolResultMessage(message);
  const text =
    !isToolResult
      ? extractText(message) ??
        (typeof m.content === "string"
          ? m.content
          : JSON.stringify(message, null, 2))
      : null;

  const timestamp =
    typeof m.timestamp === "number" ? new Date(m.timestamp).toLocaleTimeString() : "";
  const klass = role === "assistant" ? "assistant" : role === "user" ? "user" : "other";
  const who = role === "assistant" ? "Assistant" : role === "user" ? "You" : role;
  const displayWho =
    role === "assistant"
      ? opts?.assistantName?.trim() || who
      : role === "user"
        ? opts?.callMe?.trim() || who
        : who;
  return html`
    <div class="chat-line ${klass}">
      <div class="chat-msg">
        <div class="chat-bubble ${opts?.streaming ? "streaming" : ""}">
          ${text ? html`<div class="chat-text">${text}</div>` : nothing}
          ${text && klass === "assistant" ? html`<div style="margin-top:8px;"><button class="btn" @click=${() => opts?.onReadAloud?.(text)}>Read</button></div>` : nothing}
          ${toolCards.map((card) => renderToolCard(card))}
        </div>
        <div class="chat-stamp mono">
          ${displayWho}${timestamp ? html` · ${timestamp}` : nothing}
        </div>
      </div>
    </div>
  `;
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

type ToolCard = {
  kind: "call" | "result";
  name: string;
  args?: unknown;
  text?: string;
};

function extractToolCards(message: unknown): ToolCard[] {
  const m = message as Record<string, unknown>;
  const content = normalizeContent(m.content);
  const cards: ToolCard[] = [];

  for (const item of content) {
    const kind = String(item.type ?? "").toLowerCase();
    const isToolCall =
      ["toolcall", "tool_call", "tooluse", "tool_use"].includes(kind) ||
      (typeof item.name === "string" && item.arguments != null);
    if (isToolCall) {
      cards.push({
        kind: "call",
        name: (item.name as string) ?? "tool",
        args: coerceArgs(item.arguments ?? item.args),
      });
    }
  }

  for (const item of content) {
    const kind = String(item.type ?? "").toLowerCase();
    if (kind !== "toolresult" && kind !== "tool_result") continue;
    const text = extractToolText(item);
    const name = typeof item.name === "string" ? item.name : "tool";
    cards.push({ kind: "result", name, text });
  }

  if (isToolResultMessage(message) && !cards.some((card) => card.kind === "result")) {
    const name =
      (typeof m.toolName === "string" && m.toolName) ||
      (typeof m.tool_name === "string" && m.tool_name) ||
      "tool";
    const text = extractText(message) ?? undefined;
    cards.push({ kind: "result", name, text });
  }

  return cards;
}

function renderToolCard(card: ToolCard) {
  const display = resolveToolDisplay({ name: card.name, args: card.args });
  const detail = formatToolDetail(display);
  return html`
    <div class="chat-tool-card">
      <div class="chat-tool-card__title">${display.emoji} ${display.label}</div>
      ${detail
        ? html`<div class="chat-tool-card__detail">${detail}</div>`
        : nothing}
      ${card.text
        ? html`<div class="chat-tool-card__output">${card.text}</div>`
        : nothing}
    </div>
  `;
}

function normalizeContent(content: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(content)) return [];
  return content.filter(Boolean) as Array<Record<string, unknown>>;
}

function coerceArgs(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function extractToolText(item: Record<string, unknown>): string | undefined {
  if (typeof item.text === "string") return item.text;
  if (typeof item.content === "string") return item.content;
  return undefined;
}

function isToolResultMessage(message: unknown): boolean {
  const m = message as Record<string, unknown>;
  const role = typeof m.role === "string" ? m.role.toLowerCase() : "";
  return role === "toolresult" || role === "tool_result";
}

