import { html } from "lit";

import type { CognitiveState } from "../cognitive-store";

export function renderDashboard(props: {
  cognitive: CognitiveState;
  onWellbeing: (key: "cognitiveLoad" | "wellbeing", value: number) => void;
}) {
  const priorities = props.cognitive.actions
    .filter((x) => x.status === "accepted" || x.status === "scheduled")
    .slice(0, 5);
  const recentMem = props.cognitive.memory.slice(0, 5);
  const reflectionCount = props.cognitive.actions.filter((x) => x.reflection).length;
  return html`
    <section class="hero-panel compact">
      <div class="hero-panel__copy">
        <div class="hero-panel__eyebrow">Daily rhythm</div>
        <h2>Stay on top of what matters without feeling buried in admin.</h2>
        <p>This space is for priorities, energy, and momentum. System health stays on Home so this view can stay personal.</p>
      </div>
      <div class="hero-panel__stats">
        <div class="hero-stat">
          <div class="hero-stat__label">Daily budget</div>
          <div class="hero-stat__value">${props.cognitive.economy.dailyBudget}</div>
          <div class="hero-stat__sub">Assistant credits available today</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat__label">Active priorities</div>
          <div class="hero-stat__value">${priorities.length}</div>
          <div class="hero-stat__sub">Accepted or scheduled next steps</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat__label">Reflections</div>
          <div class="hero-stat__value">${reflectionCount}</div>
          <div class="hero-stat__sub">Captured learnings from recent work</div>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-2">
      <div class="card card-soft">
        <div class="section-title">Daily priorities</div>
        <div class="stack" style="margin-top:12px;">
          ${priorities.length
            ? priorities.map(
                (p) => html`<div class="list-item"><div>${p.title}</div><div class="pill">${p.status}</div></div>`,
              )
            : html`<div class="muted">No priorities yet</div>`}
        </div>
      </div>
      <div class="card card-soft">
        <div class="section-title">Energy check-in</div>
        <div class="section-sub">A simple way to reflect how full your plate feels today.</div>
        <label class="field"><span>Cognitive load (${props.cognitive.wellbeing.cognitiveLoad})</span><input type="range" min="0" max="100" .value=${String(props.cognitive.wellbeing.cognitiveLoad)} @input=${(e: Event) => props.onWellbeing("cognitiveLoad", Number((e.target as HTMLInputElement).value))} /></label>
        <label class="field"><span>Wellbeing (${props.cognitive.wellbeing.wellbeing})</span><input type="range" min="0" max="100" .value=${String(props.cognitive.wellbeing.wellbeing)} @input=${(e: Event) => props.onWellbeing("wellbeing", Number((e.target as HTMLInputElement).value))} /></label>
      </div>
    </section>

    <section class="grid grid-cols-2">
      <div class="card card-soft">
        <div class="section-title">Recent memories</div>
        <div class="stack" style="margin-top:12px;">
          ${recentMem.map((m) => html`<div class="list-item"><div>${m.title}</div><div class="pill">${m.layer}</div></div>`)}
        </div>
      </div>
      <div class="card card-soft">
        <div class="section-title">Budget balance</div>
        <div class="table" style="margin-top:12px;">
          <div class="table-head"><div>Assistant lane</div><div>Allocation</div></div>
          ${Object.entries(props.cognitive.economy.allocations).map(([agent, amount]) => html`<div class="table-row"><div>${agent}</div><div>${amount}</div></div>`)}
        </div>
      </div>
    </section>
  `;
}
