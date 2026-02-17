import { html } from "lit";
import type { CognitiveState } from "../cognitive-store";

export function renderDashboard(props: {
  cognitive: CognitiveState;
  onWellbeing: (key: "cognitiveLoad" | "wellbeing", value: number) => void;
}) {
  const priorities = props.cognitive.actions.filter((x) => x.status === "accepted" || x.status === "scheduled").slice(0, 5);
  const recentMem = props.cognitive.memory.slice(0, 5);
  const reflectionCount = props.cognitive.actions.filter((x) => x.reflection).length;
  return html`
    <section class="grid grid-cols-3">
      <div class="card stat-card"><div class="stat-label">Daily Credit Budget</div><div class="stat-value">${props.cognitive.economy.dailyBudget}</div></div>
      <div class="card stat-card"><div class="stat-label">Accepted Priorities</div><div class="stat-value">${priorities.length}</div></div>
      <div class="card stat-card"><div class="stat-label">Reflections</div><div class="stat-value">${reflectionCount}</div></div>
    </section>

    <section class="card">
      <div class="card-title">Daily Priorities</div>
      <div class="stack" style="margin-top:12px;">
        ${priorities.length ? priorities.map((p) => html`<div class="list-item"><div>${p.title}</div><div class="pill">${p.status}</div></div>`) : html`<div class="muted">No priorities yet</div>`}
      </div>
    </section>

    <section class="grid grid-cols-2">
      <div class="card">
        <div class="card-title">Recent Memories</div>
        <div class="stack" style="margin-top:12px;">${recentMem.map((m) => html`<div class="list-item"><div>${m.title}</div><div class="pill">${m.layer}</div></div>`)}</div>
      </div>
      <div class="card">
        <div class="card-title">Wellbeing Inputs</div>
        <label class="field"><span>Cognitive load (${props.cognitive.wellbeing.cognitiveLoad})</span><input type="range" min="0" max="100" .value=${String(props.cognitive.wellbeing.cognitiveLoad)} @input=${(e: Event) => props.onWellbeing("cognitiveLoad", Number((e.target as HTMLInputElement).value))} /></label>
        <label class="field"><span>Wellbeing (${props.cognitive.wellbeing.wellbeing})</span><input type="range" min="0" max="100" .value=${String(props.cognitive.wellbeing.wellbeing)} @input=${(e: Event) => props.onWellbeing("wellbeing", Number((e.target as HTMLInputElement).value))} /></label>
      </div>
    </section>

    <section class="card">
      <div class="card-title">Personal Economy (demo)</div>
      <div class="table" style="margin-top:12px;">
        <div class="table-head"><div>Agent</div><div>Allocation</div></div>
        ${Object.entries(props.cognitive.economy.allocations).map(([agent, amount]) => html`<div class="table-row"><div>${agent}</div><div>${amount}</div></div>`)}
      </div>
    </section>
  `;
}
