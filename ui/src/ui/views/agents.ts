import { html } from "lit";
import type { ActionCard, AgentSuggestion, CognitiveState } from "../cognitive-store";

export function renderAgents(props: {
  cognitive: CognitiveState;
  onRunAgents: () => void;
  onAction: (id: string, mode: "accepted" | "scheduled" | "dismissed") => void;
  onReflect: (id: string, done: boolean, usefulness: number, obstacle: string) => void;
}) {
  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">Agents Stack</div>
          <div class="card-sub">Core, functional and advanced agents generate confidence-scored suggestions.</div>
        </div>
        <button class="btn primary" @click=${props.onRunAgents}>Run agents</button>
      </div>
      <div class="stack" style="margin-top: 12px;">
        ${props.cognitive.agentSuggestions.map(renderAgentSuggestion)}
      </div>
    </section>

    <section class="card">
      <div class="card-title">Action Cards + Reflection</div>
      <div class="stack" style="margin-top: 12px;">
        ${props.cognitive.actions.map((card) => renderActionCard(card, props.onAction, props.onReflect))}
      </div>
    </section>
  `;
}

function renderAgentSuggestion(row: AgentSuggestion) {
  return html`
    <div class="list-item">
      <div>
        <div class="note-title">${row.agent}</div>
        <div>${row.title}</div>
        <div class="muted">confidence=${Math.round(row.confidence * 100)}% · memories=${row.relatedMemoryIds.join(",") || "none"}</div>
      </div>
      ${row.blockedBy ? html`<div class="pill danger">blocked: ${row.blockedBy}</div>` : html`<div class="pill">ok</div>`}
    </div>
  `;
}

function renderActionCard(
  card: ActionCard,
  onAction: (id: string, mode: "accepted" | "scheduled" | "dismissed") => void,
  onReflect: (id: string, done: boolean, usefulness: number, obstacle: string) => void,
) {
  return html`
    <div class="list-item" style="align-items: start;">
      <div>
        <div class="note-title">${card.title}</div>
        <div>${card.rationale}</div>
        <div class="muted">${card.whyRetrieved}</div>
        <div class="muted">status=${card.status} · confidence=${Math.round(card.confidence * 100)}%</div>
        ${card.reflection
          ? html`<div class="pill">Reflection: ${card.reflection.done ? "done" : "not done"}, usefulness=${card.reflection.usefulness}/5</div>`
          : ""}
      </div>
      <div class="stack">
        <div class="row">
          <button class="btn primary" @click=${() => onAction(card.id, "accepted")}>Accept</button>
          <button class="btn" @click=${() => onAction(card.id, "scheduled")}>Schedule</button>
          <button class="btn danger" @click=${() => onAction(card.id, "dismissed")}>Dismiss</button>
        </div>
        <button class="btn" @click=${() => onReflect(card.id, true, 4, "")}>Reflect quick (+)</button>
      </div>
    </div>
  `;
}
