import { html } from "lit";

import type { EventLogEntry } from "../app-render";
import type { GatewayHelloOk } from "../gateway";
import { formatAgo, formatDurationMs } from "../format";
import { formatNextRun } from "../presenter";
import type { UiSettings } from "../storage";
import type { ProvidersStatusSnapshot } from "../types";

export type OverviewProps = {
  connected: boolean;
  hello: GatewayHelloOk | null;
  settings: UiSettings;
  password: string;
  lastError: string | null;
  presenceCount: number;
  sessionsCount: number | null;
  cronEnabled: boolean | null;
  cronNext: number | null;
  nodes: Array<Record<string, unknown>>;
  providersSnapshot: ProvidersStatusSnapshot | null;
  eventLog: EventLogEntry[];
  lastProvidersRefresh: number | null;
  onSettingsChange: (next: UiSettings) => void;
  onPasswordChange: (next: string) => void;
  onSessionKeyChange: (next: string) => void;
  onRefresh: () => void;
};

export function renderOverview(props: OverviewProps) {
  const snapshot = props.hello?.snapshot as
    | { uptimeMs?: number; policy?: { tickIntervalMs?: number } }
    | undefined;
  const uptime = snapshot?.uptimeMs ? formatDurationMs(snapshot.uptimeMs) : "n/a";
  const tick = snapshot?.policy?.tickIntervalMs
    ? `${snapshot.policy.tickIntervalMs}ms`
    : "n/a";
  const linkedApps = countLinkedApps(props.providersSnapshot);
  const activeDevices = props.nodes.filter((node) => Boolean(node.connected)).length;

  return html`
    <section class="hero-panel">
      <div class="hero-panel__copy">
        <div class="hero-panel__eyebrow">${props.connected ? "Everything is connected" : "Connection needs attention"}</div>
        <h2>Keep up with your assistant at a glance.</h2>
        <p>
          Home is the quick read: what is connected, what changed recently, and where to go next.
        </p>
        <div class="hero-panel__actions">
          <button class="btn primary" @click=${() => props.onRefresh()}>Refresh</button>
          <div class="hero-panel__hint">Use Linked Apps for setup and Conversations for detailed history.</div>
        </div>
      </div>
      <div class="hero-panel__stats">
        ${renderHeroStat("Status", props.connected ? "Ready" : "Offline", props.connected ? "Connected to your gateway" : "Reconnect to resume sync")}
        ${renderHeroStat("Linked apps", String(linkedApps), "Gemini and messaging services")}
        ${renderHeroStat("Active devices", String(activeDevices), "Browsers, phones, and nodes online")}
        ${renderHeroStat("Next routine", formatNextRun(props.cronNext), props.cronEnabled ? "Routines are enabled" : "No active routine yet")}
      </div>
    </section>

    <section class="grid grid-cols-2">
      <div class="card card-soft">
        <div class="section-title">Quick health</div>
        <div class="section-sub">A simple system snapshot without dropping you into technical logs.</div>
        <div class="stat-grid overview-stats">
          <div class="stat">
            <div class="stat-label">Gateway uptime</div>
            <div class="stat-value">${uptime}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Heartbeat rhythm</div>
            <div class="stat-value">${tick}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Recent conversations</div>
            <div class="stat-value">${props.sessionsCount ?? "n/a"}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Presence beacons</div>
            <div class="stat-value">${props.presenceCount}</div>
          </div>
        </div>
        ${props.lastError
          ? html`<div class="callout danger" style="margin-top: 14px;">${props.lastError}</div>`
          : html`<div class="callout" style="margin-top: 14px;">Last provider refresh ${props.lastProvidersRefresh ? formatAgo(props.lastProvidersRefresh) : "not available yet"}.</div>`}
      </div>

      <div class="card card-soft">
        <div class="section-title">Recent activity</div>
        <div class="section-sub">A friendly timeline of the latest assistant events.</div>
        <div class="timeline" style="margin-top: 16px;">
          ${props.eventLog.length
            ? props.eventLog.map(
                (entry) => html`
                  <div class="timeline-item">
                    <div class="timeline-item__dot"></div>
                    <div class="timeline-item__body">
                      <div class="timeline-item__title">${humanizeEvent(entry.event)}</div>
                      <div class="timeline-item__sub">${new Date(entry.ts).toLocaleTimeString()}</div>
                    </div>
                  </div>
                `,
              )
            : html`<div class="muted">No recent activity yet.</div>`}
        </div>
      </div>
    </section>

    <section class="grid grid-cols-2">
      <div class="card card-soft">
        <div class="section-title">Connection basics</div>
        <div class="section-sub">Quick local access settings for this device only.</div>
        <div class="form-grid" style="margin-top: 16px;">
          <label class="field">
            <span>Gateway address</span>
            <input
              .value=${props.settings.gatewayUrl}
              @input=${(e: Event) => {
                const v = (e.target as HTMLInputElement).value;
                props.onSettingsChange({ ...props.settings, gatewayUrl: v });
              }}
              placeholder="ws://100.x.y.z:18789"
            />
          </label>
          <label class="field">
            <span>Gateway token</span>
            <input
              .value=${props.settings.token}
              @input=${(e: Event) => {
                const v = (e.target as HTMLInputElement).value;
                props.onSettingsChange({ ...props.settings, token: v });
              }}
              placeholder="Gateway token"
            />
          </label>
          <label class="field">
            <span>Password (not stored)</span>
            <input
              type="password"
              .value=${props.password}
              @input=${(e: Event) => {
                const v = (e.target as HTMLInputElement).value;
                props.onPasswordChange(v);
              }}
              placeholder="system or shared password"
            />
          </label>
          <label class="field">
            <span>Default conversation</span>
            <input
              .value=${props.settings.sessionKey}
              @input=${(e: Event) => {
                const v = (e.target as HTMLInputElement).value;
                props.onSessionKeyChange(v);
              }}
            />
          </label>
        </div>
      </div>

      <div class="card card-soft">
        <div class="section-title">Where to go next</div>
        <div class="section-sub">Each page has one clear job so the app stays simple to navigate.</div>
        <div class="stack" style="margin-top: 16px;">
          <div class="list-item simple">
            <div class="list-main">
              <div class="list-title">Talk</div>
              <div class="list-sub">Live conversations, streaming replies, and voice controls.</div>
            </div>
          </div>
          <div class="list-item simple">
            <div class="list-main">
              <div class="list-title">Linked Apps</div>
              <div class="list-sub">Gemini setup and messaging integrations only.</div>
            </div>
          </div>
          <div class="list-item simple">
            <div class="list-main">
              <div class="list-title">Developer Tools</div>
              <div class="list-sub">Raw logs, manual RPC calls, and snapshots for troubleshooting.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderHeroStat(label: string, value: string, sub: string) {
  return html`
    <div class="hero-stat">
      <div class="hero-stat__label">${label}</div>
      <div class="hero-stat__value">${value}</div>
      <div class="hero-stat__sub">${sub}</div>
    </div>
  `;
}

function countLinkedApps(snapshot: ProvidersStatusSnapshot | null) {
  if (!snapshot) return 0;
  return [
    snapshot.whatsapp.configured || snapshot.whatsapp.linked || snapshot.whatsapp.running,
    snapshot.telegram.configured || snapshot.telegram.running,
    Boolean(snapshot.discord?.configured || snapshot.discord?.running),
    Boolean(snapshot.signal?.configured || snapshot.signal?.running),
    Boolean(snapshot.imessage?.configured || snapshot.imessage?.running),
  ].filter(Boolean).length;
}

function humanizeEvent(event: string) {
  return event
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
