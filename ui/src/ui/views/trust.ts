import { html } from "lit";
import type { AuditEvent, CognitiveState, GrantDuration, PermissionGrant } from "../cognitive-store";

export function renderTrust(props: {
  cognitive: CognitiveState;
  onPermission: (scope: PermissionGrant["scope"], enabled: boolean, duration: GrantDuration) => void;
}) {
  return html`
    <section class="card">
      <div class="card-title">Permissions & Trust Center</div>
      <div class="card-sub">Zero-trust defaults. New scopes are OFF until explicitly granted.</div>
      <div class="stack" style="margin-top:12px;">
        ${props.cognitive.permissions.map((p) => renderPermission(p, props.onPermission))}
      </div>
    </section>

    <section class="card">
      <div class="card-title">Audit Log (append-only)</div>
      <div class="card-sub">Includes memory, agent, suggestions, action and voice usage events.</div>
      <div class="table" style="margin-top: 12px;">
        <div class="table-head"><div>Time</div><div>Event</div><div>Detail</div></div>
        ${props.cognitive.auditLog.length
          ? props.cognitive.auditLog.slice(0, 100).map((evt) => renderAuditRow(evt))
          : html`<div class="table-row"><div>—</div><div>No events yet</div><div></div></div>`}
      </div>
    </section>
  `;
}

function renderPermission(
  p: PermissionGrant,
  onPermission: (scope: PermissionGrant["scope"], enabled: boolean, duration: GrantDuration) => void,
) {
  const expires = p.expiresAt ? new Date(p.expiresAt).toLocaleString() : "never";
  return html`
    <div class="list-item">
      <div>
        <div class="note-title">${p.scope}</div>
        <div class="muted">${p.enabled ? `Granted until ${expires}` : "Revoked"}</div>
      </div>
      <div class="row">
        <select .value=${p.duration} @change=${(e: Event) => onPermission(p.scope, p.enabled, (e.target as HTMLSelectElement).value as GrantDuration)}>
          <option value="15m">15m</option>
          <option value="1h">1h</option>
          <option value="1d">1d</option>
          <option value="30d">30d</option>
          <option value="forever">forever</option>
        </select>
        <button class="btn ${p.enabled ? "danger" : "primary"}" @click=${() => onPermission(p.scope, !p.enabled, p.duration)}>
          ${p.enabled ? "Revoke" : "Grant"}
        </button>
      </div>
    </div>
  `;
}

function renderAuditRow(evt: AuditEvent) {
  return html`
    <div class="table-row">
      <div class="mono">${new Date(evt.ts).toLocaleTimeString()}</div>
      <div>${evt.kind}</div>
      <div>${evt.detail}</div>
    </div>
  `;
}
