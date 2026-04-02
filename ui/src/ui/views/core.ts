import { html, nothing } from "lit";

import type { ImprovementIdea, UiSettings } from "../storage";

const PERSONALITY_PRESETS = [
  {
    label: "Warm",
    value:
      "Warm, encouraging, calm, and emotionally intelligent. Helpful without sounding robotic or overly technical.",
  },
  {
    label: "Direct",
    value:
      "Clear, concise, decisive, and practical. Skip fluff, keep it useful, and get to the point kindly.",
  },
  {
    label: "Strategic",
    value:
      "Thoughtful, structured, and forward-looking. Help with tradeoffs, planning, and prioritizing what matters most.",
  },
  {
    label: "Playful",
    value:
      "Light, witty, and upbeat while still being competent and grounded. Friendly without becoming distracting.",
  },
] as const;

export type CoreProps = {
  settings: UiSettings;
  password: string;
  connected: boolean;
  improvementIdeas: ImprovementIdea[];
  ideaDraft: string;
  raw: string;
  valid: boolean | null;
  issues: unknown[];
  loading: boolean;
  saving: boolean;
  onSettingsChange: (next: UiSettings) => void;
  onPasswordChange: (next: string) => void;
  onIdeaDraftChange: (next: string) => void;
  onIdeaCreate: () => void;
  onIdeaApprove: (id: string) => void;
  onIdeaImplemented: (id: string) => void;
  onIdeaDelete: (id: string) => void;
  onRawChange: (next: string) => void;
  onReload: () => void;
  onSave: () => void;
};

export function renderCore(props: CoreProps) {
  const assistantName = props.settings.assistantName.trim() || "Miya";
  const brandName = props.settings.brandName.trim() || assistantName;
  const callMe = props.settings.callMe.trim() || "friend";
  const validity =
    props.valid == null ? "unknown" : props.valid ? "valid" : "invalid";

  return html`
    <section class="grid grid-cols-2">
      <div class="card card-soft">
        <div class="section-title">Identity</div>
        <div class="section-sub">
          Shape how the assistant feels in the app before you worry about the technical side.
        </div>
        <div class="form-grid" style="margin-top: 16px;">
          <label class="field">
            <span>App name</span>
            <input
              .value=${props.settings.brandName}
              @input=${(e: Event) =>
                props.onSettingsChange({
                  ...props.settings,
                  brandName: (e.target as HTMLInputElement).value,
                })}
              placeholder="Miya"
            />
          </label>
          <label class="field">
            <span>Assistant name</span>
            <input
              .value=${props.settings.assistantName}
              @input=${(e: Event) =>
                props.onSettingsChange({
                  ...props.settings,
                  assistantName: (e.target as HTMLInputElement).value,
                })}
              placeholder="Miya"
            />
          </label>
          <label class="field">
            <span>What should it call you?</span>
            <input
              .value=${props.settings.callMe}
              @input=${(e: Event) =>
                props.onSettingsChange({
                  ...props.settings,
                  callMe: (e.target as HTMLInputElement).value,
                })}
              placeholder="Jasijah"
            />
          </label>
          <label class="field full">
            <span>Personality</span>
            <textarea
              .value=${props.settings.personality}
              @input=${(e: Event) =>
                props.onSettingsChange({
                  ...props.settings,
                  personality: (e.target as HTMLTextAreaElement).value,
                })}
              rows="6"
            ></textarea>
          </label>
        </div>
        <div class="chip-row" style="margin-top: 14px;">
          ${PERSONALITY_PRESETS.map(
            (preset) => html`
              <button
                class="chip action"
                @click=${() =>
                  props.onSettingsChange({
                    ...props.settings,
                    personality: preset.value,
                  })}
              >
                ${preset.label}
              </button>
            `,
          )}
        </div>
      </div>

      <div class="card card-soft">
        <div class="section-title">Preview</div>
        <div class="section-sub">
          A quick read on how your assistant will present itself around the app.
        </div>
        <div class="stack" style="margin-top: 18px;">
          <div class="core-preview">
            <div class="core-preview__kicker">${brandName}</div>
            <div class="core-preview__headline">${assistantName}</div>
            <div class="core-preview__body">
              Hi ${callMe}. I'm ${assistantName}, and I'll keep things calm, clear, and useful.
            </div>
          </div>
          <div class="callout">
            ${props.settings.personality.trim() || "Add a personality note to tune the assistant's tone."}
          </div>
          <div class="pill subtle">
            <span class="statusDot ${props.connected ? "ok" : ""}"></span>
            <span>${props.connected ? "Connected right now" : "Offline right now"}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-2">
      <div class="card card-soft">
        <div class="section-title">Improve Miya</div>
        <div class="section-sub">
          Capture ideas here, review them, and send the good ones straight into Build.
        </div>
        <label class="field" style="margin-top: 16px;">
          <span>What should Miya get better at?</span>
          <textarea
            .value=${props.ideaDraft}
            @input=${(e: Event) =>
              props.onIdeaDraftChange((e.target as HTMLTextAreaElement).value)}
            rows="5"
            placeholder="Add a calmer onboarding flow, improve the home screen, or create a new everyday feature."
          ></textarea>
        </label>
        <div class="chip-row" style="margin-top: 14px;">
          <button class="chip action" @click=${() => props.onIdeaDraftChange("Add a friendlier onboarding flow that helps people start using Miya in under two minutes.")}>Softer onboarding</button>
          <button class="chip action" @click=${() => props.onIdeaDraftChange("Create a daily planning view that feels personal, lightweight, and easy to return to each morning.")}>Daily planning</button>
          <button class="chip action" @click=${() => props.onIdeaDraftChange("Add a provider health center with clear language so people always know whether Miya is ready.")}>Health center</button>
        </div>
        <div class="row" style="margin-top: 14px;">
          <button class="btn primary" @click=${props.onIdeaCreate}>Save idea</button>
        </div>
      </div>

      <div class="card card-soft">
        <div class="section-title">Idea pipeline</div>
        <div class="section-sub">
          Approve an idea to move it into Build. Mark it done after it becomes a real app or feature.
        </div>
        <div class="stack" style="margin-top: 16px;">
          ${props.improvementIdeas.length
            ? props.improvementIdeas.map(
                (idea) => html`
                  <div class="list-item">
                    <div>
                      <div class="note-title">${idea.title}</div>
                      <div class="muted">${idea.source} · ${new Date(idea.createdAt).toLocaleString()}</div>
                      <div style="margin-top: 6px;">${idea.note}</div>
                    </div>
                    <div class="stack">
                      <span class="pill">${idea.status}</span>
                      <button class="btn primary" ?disabled=${idea.status === "approved" || idea.status === "implemented"} @click=${() => props.onIdeaApprove(idea.id)}>Approve for Build</button>
                      <button class="btn" ?disabled=${idea.status === "implemented"} @click=${() => props.onIdeaImplemented(idea.id)}>Mark done</button>
                      <button class="btn" @click=${() => props.onIdeaDelete(idea.id)}>Remove</button>
                    </div>
                  </div>
                `,
              )
            : html`<div class="callout">No product ideas yet. Save one here or from Talk.</div>`}
        </div>
      </div>
    </section>

    <section class="grid grid-cols-2">
      <div class="card card-soft">
        <div class="section-title">Connection basics</div>
        <div class="section-sub">These settings stay local to this device and help the UI reconnect smoothly.</div>
        <div class="form-grid" style="margin-top: 16px;">
          <label class="field">
            <span>Gateway address</span>
            <input
              .value=${props.settings.gatewayUrl}
              @input=${(e: Event) =>
                props.onSettingsChange({
                  ...props.settings,
                  gatewayUrl: (e.target as HTMLInputElement).value,
                })}
              placeholder="ws://127.0.0.1:18789"
            />
          </label>
          <label class="field">
            <span>Gateway token</span>
            <input
              .value=${props.settings.token}
              @input=${(e: Event) =>
                props.onSettingsChange({
                  ...props.settings,
                  token: (e.target as HTMLInputElement).value,
                })}
              placeholder="Gateway token"
            />
          </label>
          <label class="field">
            <span>Password (not stored)</span>
            <input
              type="password"
              .value=${props.password}
              @input=${(e: Event) =>
                props.onPasswordChange((e.target as HTMLInputElement).value)}
              placeholder="Optional password"
            />
          </label>
          <label class="field">
            <span>Default conversation</span>
            <input
              .value=${props.settings.sessionKey}
              @input=${(e: Event) =>
                props.onSettingsChange({
                  ...props.settings,
                  sessionKey: (e.target as HTMLInputElement).value,
                })}
            />
          </label>
        </div>
      </div>

      <div class="card card-soft">
        <div class="row" style="justify-content: space-between;">
          <div>
            <div class="section-title">Advanced config</div>
            <div class="section-sub">For direct gateway JSON edits when you need something deeper than the Core controls.</div>
          </div>
          <div class="row">
            <span class="pill">${validity}</span>
            <button class="btn" ?disabled=${props.loading} @click=${props.onReload}>
              ${props.loading ? "Loading..." : "Reload"}
            </button>
            <button class="btn primary" ?disabled=${props.saving || !props.connected} @click=${props.onSave}>
              ${props.saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div class="muted" style="margin-top: 10px;">
          Writes to <span class="mono">~/.clawdis/clawdis.json</span>. Some changes still need a gateway restart.
        </div>

        <label class="field" style="margin-top: 12px;">
          <span>Raw JSON5</span>
          <textarea
            .value=${props.raw}
            @input=${(e: Event) =>
              props.onRawChange((e.target as HTMLTextAreaElement).value)}
          ></textarea>
        </label>

        ${props.issues.length > 0
          ? html`<div class="callout danger" style="margin-top: 12px;">
              <pre class="code-block">${JSON.stringify(props.issues, null, 2)}</pre>
            </div>`
          : nothing}
      </div>
    </section>
  `;
}
