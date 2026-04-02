import { html, nothing } from "lit";

import type { BuildDraftRecord, BuildHistoryEntry } from "../storage";

export type BuildPalette = "sunrise" | "ocean" | "forest" | "graphite";
export type BuildLayout = "dashboard" | "mobile" | "studio";
export type BuildScreenId = "home" | "details" | "settings";

export type BuildScreens = Record<BuildScreenId, string>;

export type BuildCode = {
  screens: BuildScreens;
  css: string;
  js: string;
};

export type BuildProps = {
  brandName: string;
  assistantName: string;
  title: string;
  prompt: string;
  refinePrompt: string;
  palette: BuildPalette;
  layout: BuildLayout;
  code: BuildCode;
  activeScreen: BuildScreenId;
  drafts: BuildDraftRecord[];
  history: BuildHistoryEntry[];
  selectedDraftId: string | null;
  generating: boolean;
  status: string | null;
  onTitleChange: (next: string) => void;
  onPromptChange: (next: string) => void;
  onRefinePromptChange: (next: string) => void;
  onPaletteChange: (next: BuildPalette) => void;
  onLayoutChange: (next: BuildLayout) => void;
  onScreenChange: (next: BuildScreenId) => void;
  onCodeChange: (kind: "screen" | "css" | "js", next: string, screen?: BuildScreenId) => void;
  onGenerate: () => void;
  onRefine: () => void;
  onSaveDraft: () => void;
  onExport: () => void;
  onScaffold: () => void;
  onSelectDraft: (id: string) => void;
  onRestoreHistory: (id: string) => void;
  onNewDraft: () => void;
  onDeleteDraft: (id: string) => void;
};

const QUICK_IDEAS = [
  "A habit tracker for mornings and evenings",
  "A meal planner with grocery highlights",
  "A couple's shared trip board with countdown",
  "A kid-friendly homework dashboard",
];

const QUICK_REFINES = [
  "Make it feel more premium",
  "Turn this into a mobile-first app",
  "Make the onboarding softer and simpler",
  "Reduce the visual clutter and increase clarity",
];

const SCREEN_ORDER: BuildScreenId[] = ["home", "details", "settings"];

export function renderBuild(props: BuildProps) {
  const preview = buildPreviewDocument(props.code, props.activeScreen);
  const currentScreenMarkup = props.code.screens[props.activeScreen];

  return html`
    <section class="builder-shell">
      <div class="builder-hero">
        <div>
          <div class="builder-hero__eyebrow">Studio</div>
          <h2>Shape app ideas, generate multi-screen concepts, and preview them live.</h2>
          <p>Use a short brief, tune the direction, then refine each screen directly without leaving ${props.brandName}.</p>
        </div>
        <div class="builder-hero__meta">
          <div class="hero-stat">
            <div class="hero-stat__label">Mode</div>
            <div class="hero-stat__value">${props.generating ? "Generating" : "Multi-screen studio"}</div>
            <div class="hero-stat__sub">${props.status ?? "Three screens, saved drafts, structured export, and live preview."}</div>
          </div>
        </div>
      </div>

      <div class="builder-workspace builder-workspace--wide">
        <aside class="builder-drafts">
          <div class="row" style="justify-content: space-between;">
            <div>
              <div class="section-title">Drafts</div>
              <div class="section-sub">Keep multiple ideas and jump between them.</div>
            </div>
            <button class="btn" @click=${props.onNewDraft}>New</button>
          </div>
          <div class="builder-draft-list">
            ${props.drafts.length
              ? props.drafts.map(
                  (draft) => html`
                    <div class="builder-draft-card ${draft.id === props.selectedDraftId ? "active" : ""}">
                      <button class="builder-draft-card__button" @click=${() => props.onSelectDraft(draft.id)}>
                        <span class="builder-draft-card__title">${draft.name}</span>
                        <span class="builder-draft-card__sub">${new Date(draft.updatedAt).toLocaleString()}</span>
                      </button>
                      <button class="builder-draft-card__delete" @click=${() => props.onDeleteDraft(draft.id)} aria-label="Delete draft">x</button>
                    </div>
                  `,
                )
              : html`<div class="muted">No drafts yet. Generate one or save your current work.</div>`}
          </div>
        </aside>

        <section class="builder-panel">
          <div class="section-title">Prompt</div>
          <div class="section-sub">Describe what you want to build. Gemini will return a three-screen starter with shared styles and behavior.</div>

          <label class="field" style="margin-top: 16px;">
            <span>App name</span>
            <input
              .value=${props.title}
              @input=${(event: Event) => props.onTitleChange((event.target as HTMLInputElement).value)}
              placeholder="Daily Planner"
            />
          </label>

          <label class="field" style="margin-top: 14px;">
            <span>Build brief</span>
            <textarea
              .value=${props.prompt}
              @input=${(event: Event) => props.onPromptChange((event.target as HTMLTextAreaElement).value)}
              placeholder="Describe the app you want to create"
              rows="7"
            ></textarea>
          </label>

          <div class="builder-chip-row">
            ${QUICK_IDEAS.map(
              (idea) => html`<button class="chip action" @click=${() => props.onPromptChange(idea)}>${idea}</button>`,
            )}
          </div>

          <div class="builder-controls">
            <label class="field">
              <span>Palette</span>
              <select
                .value=${props.palette}
                @change=${(event: Event) =>
                  props.onPaletteChange((event.target as HTMLSelectElement).value as BuildPalette)}
              >
                <option value="sunrise">Sunrise</option>
                <option value="ocean">Ocean</option>
                <option value="forest">Forest</option>
                <option value="graphite">Graphite</option>
              </select>
            </label>
            <label class="field">
              <span>Layout</span>
              <select
                .value=${props.layout}
                @change=${(event: Event) =>
                  props.onLayoutChange((event.target as HTMLSelectElement).value as BuildLayout)}
              >
                <option value="dashboard">Dashboard</option>
                <option value="mobile">Mobile app</option>
                <option value="studio">Studio board</option>
              </select>
            </label>
          </div>

          <div class="builder-actions">
            <button class="btn primary" ?disabled=${props.generating} @click=${props.onGenerate}>
              ${props.generating ? "Generating..." : "Generate with Gemini"}
            </button>
            <button class="btn" ?disabled=${props.generating} @click=${props.onRefine}>Refine current draft</button>
            <button class="btn" @click=${props.onSaveDraft}>Save draft</button>
            <button class="btn" @click=${props.onExport}>Structured export</button>
            <button class="btn" @click=${props.onScaffold}>Create repo app</button>
          </div>

          <label class="field" style="margin-top: 16px;">
            <span>Refine what you already have</span>
            <textarea
              .value=${props.refinePrompt}
              @input=${(event: Event) => props.onRefinePromptChange((event.target as HTMLTextAreaElement).value)}
              placeholder=${`Try "make it more premium" or "turn this into a mobile-first app for ${props.assistantName}."`}
              rows="4"
            ></textarea>
          </label>

          <div class="builder-chip-row">
            ${QUICK_REFINES.map(
              (idea) => html`<button class="chip action" @click=${() => props.onRefinePromptChange(idea)}>${idea}</button>`,
            )}
          </div>
        </section>

        <section class="builder-preview">
          <div class="builder-preview__header">
            <div>
              <div class="section-title">Preview</div>
              <div class="section-sub">Switch between screens and see the live render.</div>
            </div>
            <div class="builder-preview__dots">
              <span></span><span></span><span></span>
            </div>
          </div>
          <div class="builder-screen-tabs">
            ${SCREEN_ORDER.map(
              (screen) => html`
                <button class="builder-screen-tab ${props.activeScreen === screen ? "active" : ""}" @click=${() => props.onScreenChange(screen)}>
                  ${screenLabel(screen)}
                </button>
              `,
            )}
          </div>
          <iframe
            class="builder-preview__frame"
            title="App preview"
            srcdoc=${preview}
          ></iframe>
        </section>
      </div>

      <section class="card card-soft">
        <div class="section-title">Refine History</div>
        <div class="section-sub">Restore a previous version if a refinement drifts away from what you wanted.</div>
        <div class="builder-draft-list" style="margin-top: 16px;">
          ${props.history.length
            ? props.history.map(
                (entry) => html`
                  <div class="builder-draft-card">
                    <button class="builder-draft-card__button" @click=${() => props.onRestoreHistory(entry.id)}>
                      <span class="builder-draft-card__title">${entry.title}</span>
                      <span class="builder-draft-card__sub">
                        ${entry.source} · ${new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </button>
                    <button class="btn" @click=${() => props.onRestoreHistory(entry.id)}>Restore</button>
                  </div>
                `,
              )
            : html`<div class="muted">Generate or refine a draft to build a restore history.</div>`}
        </div>
      </section>

      <section class="builder-code">
        <label class="builder-code__block field">
          <span>${screenLabel(props.activeScreen)} HTML</span>
          <textarea .value=${currentScreenMarkup} @input=${(e: Event) => props.onCodeChange("screen", (e.target as HTMLTextAreaElement).value, props.activeScreen)} rows="18"></textarea>
        </label>
        <label class="builder-code__block field">
          <span>Shared CSS</span>
          <textarea .value=${props.code.css} @input=${(e: Event) => props.onCodeChange("css", (e.target as HTMLTextAreaElement).value)} rows="18"></textarea>
        </label>
        <label class="builder-code__block field">
          <span>Shared JS</span>
          <textarea .value=${props.code.js} @input=${(e: Event) => props.onCodeChange("js", (e.target as HTMLTextAreaElement).value)} rows="18"></textarea>
        </label>
      </section>

      ${props.status ? html`<section class="callout">${props.status}</section>` : nothing}
    </section>
  `;
}

export function createStarterBuild(props: {
  title: string;
  prompt: string;
  palette: BuildPalette;
  layout: BuildLayout;
}): BuildCode {
  const title = props.title.trim() || "New App";
  const summary = summarizePrompt(props.prompt);
  const palette = paletteFor(props.palette);

  const screens: BuildScreens = {
    home: `<main class="app-shell layout-${props.layout}">
  <header class="hero">
    <span class="eyebrow">${labelForLayout(props.layout)}</span>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(summary)}</p>
  </header>
  <section class="feature-grid">
    <article class="feature-card">
      <span class="feature-label">Today</span>
      <h2>Start with the most important thing</h2>
      <p>Lead with the most useful action, then support it with just enough context to keep moving.</p>
    </article>
    <article class="feature-card">
      <span class="feature-label">Focus</span>
      <h2>See momentum clearly</h2>
      <p>Use stronger type, warmer spacing, and a focused call to action so the concept feels ready to use.</p>
    </article>
  </section>
</main>`,
    details: `<main class="app-shell layout-${props.layout}">
  <header class="hero compact">
    <span class="eyebrow">Details</span>
    <h1>${escapeHtml(title)} details</h1>
    <p>A deeper screen for progress, metrics, and supporting context.</p>
  </header>
  <section class="detail-list">
    <article class="feature-card"><h2>Progress</h2><p>Show important progress without turning the screen into a dense admin table.</p></article>
    <article class="feature-card"><h2>History</h2><p>Give people enough context to understand what changed and what comes next.</p></article>
  </section>
</main>`,
    settings: `<main class="app-shell layout-${props.layout}">
  <header class="hero compact">
    <span class="eyebrow">Settings</span>
    <h1>${escapeHtml(title)} preferences</h1>
    <p>A simple preferences screen with a friendlier structure than a raw settings dump.</p>
  </header>
  <section class="settings-stack">
    <article class="feature-card"><h2>Notifications</h2><p>Control what matters and keep the rest quiet.</p></article>
    <article class="feature-card"><h2>Appearance</h2><p>Choose a calmer palette and layout that fits everyday use.</p></article>
  </section>
</main>`,
  };

  const css = `:root {
  --bg: ${palette.bg};
  --panel: ${palette.panel};
  --ink: ${palette.ink};
  --muted: ${palette.muted};
  --accent: ${palette.accent};
  font-family: "Work Sans", system-ui, sans-serif;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, ${palette.glow}, transparent 35%),
    linear-gradient(180deg, ${palette.bg} 0%, ${palette.bg2} 100%);
  color: var(--ink);
}

.app-shell { min-height: 100vh; padding: 28px; }
.hero h1 { margin: 10px 0 8px; font-size: clamp(2.2rem, 5vw, 3.8rem); line-height: 0.98; }
.hero.compact h1 { font-size: clamp(1.8rem, 4vw, 2.8rem); }
.hero p { max-width: 56ch; color: var(--muted); }
.eyebrow, .feature-label { text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.72rem; color: var(--accent); }
.feature-grid, .detail-list, .settings-stack { display: grid; gap: 18px; margin-top: 28px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.layout-mobile .feature-grid, .layout-mobile .detail-list, .layout-mobile .settings-stack { grid-template-columns: 1fr; max-width: 420px; }
.layout-studio .feature-grid { grid-template-columns: 1.2fr 0.8fr; }
.feature-card { padding: 22px; border-radius: 28px; background: var(--panel); border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 50px rgba(0,0,0,0.12); }
.top-nav { display: flex; gap: 10px; padding: 24px 28px 0; }
.top-nav a { color: var(--ink); text-decoration: none; padding: 8px 12px; border-radius: 999px; background: rgba(255,255,255,0.08); }
@media (max-width: 700px) { .feature-grid, .detail-list, .settings-stack { grid-template-columns: 1fr; } }`;

  const js = `const screenLinks = document.querySelectorAll("[data-screen-link]");
screenLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const href = link.getAttribute("href");
    if (!href) return;
    window.location.hash = href.replace(".html", "");
  });
});`;

  return { screens, css, js };
}

export function buildPreviewDocument(code: BuildCode, activeScreen: BuildScreenId) {
  const body = code.screens[activeScreen] ?? code.screens.home;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${code.css}</style>
  </head>
  <body>
    <nav class="top-nav">
      <a href="home.html" data-screen-link>Home</a>
      <a href="details.html" data-screen-link>Details</a>
      <a href="settings.html" data-screen-link>Settings</a>
    </nav>
    ${body}
    <script>${code.js}<\/script>
  </body>
</html>`;
}

export function buildStructuredExportFiles(code: BuildCode) {
  return {
    "index.html": wrapScreenDocument("Home", code, "home"),
    "details.html": wrapScreenDocument("Details", code, "details"),
    "settings.html": wrapScreenDocument("Settings", code, "settings"),
    "styles.css": code.css,
    "app.js": code.js,
    "builder.manifest.json": JSON.stringify(
      {
        version: 1,
        screens: SCREEN_ORDER,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  } as const;
}

export function parseGeneratedBuildResponse(raw: string): {
  title?: string;
  screens?: Partial<BuildScreens>;
  html?: string;
  css?: string;
  js?: string;
} | null {
  const cleaned = raw.trim();
  const direct = safeParseJson(cleaned);
  if (direct) return direct;

  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const parsed = safeParseJson(fenced[1].trim());
    if (parsed) return parsed;
  }

  const braceStart = cleaned.indexOf("{");
  const braceEnd = cleaned.lastIndexOf("}");
  if (braceStart >= 0 && braceEnd > braceStart) {
    const parsed = safeParseJson(cleaned.slice(braceStart, braceEnd + 1));
    if (parsed) return parsed;
  }

  return null;
}

function wrapScreenDocument(title: string, code: BuildCode, screen: BuildScreenId) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <nav class="top-nav">
      <a href="index.html">Home</a>
      <a href="details.html">Details</a>
      <a href="settings.html">Settings</a>
    </nav>
    ${code.screens[screen]}
    <script src="app.js"><\/script>
  </body>
</html>`;
}

function screenLabel(screen: BuildScreenId) {
  switch (screen) {
    case "home":
      return "Home";
    case "details":
      return "Details";
    case "settings":
      return "Settings";
    default:
      return screen;
  }
}

function safeParseJson(raw: string) {
  try {
    return JSON.parse(raw) as {
      title?: string;
      screens?: Partial<BuildScreens>;
      html?: string;
      css?: string;
      js?: string;
    };
  } catch {
    return null;
  }
}

function summarizePrompt(prompt: string) {
  const trimmed = prompt.trim();
  if (!trimmed) return "A polished assistant-built app concept with a clean layout and a clear next step.";
  return trimmed.length > 160 ? `${trimmed.slice(0, 157)}...` : trimmed;
}

function labelForLayout(layout: BuildLayout) {
  switch (layout) {
    case "mobile":
      return "Mobile concept";
    case "studio":
      return "Studio board";
    default:
      return "Product concept";
  }
}

function paletteFor(palette: BuildPalette) {
  switch (palette) {
    case "ocean":
      return {
        bg: "#061a2c",
        bg2: "#0e2740",
        panel: "rgba(10, 28, 44, 0.82)",
        ink: "#ecf8ff",
        muted: "rgba(214, 237, 247, 0.72)",
        accent: "#4cc9f0",
        glow: "rgba(76, 201, 240, 0.22)",
      };
    case "forest":
      return {
        bg: "#081610",
        bg2: "#10251a",
        panel: "rgba(15, 33, 24, 0.84)",
        ink: "#eff8f1",
        muted: "rgba(214, 234, 218, 0.72)",
        accent: "#57cc99",
        glow: "rgba(87, 204, 153, 0.22)",
      };
    case "graphite":
      return {
        bg: "#121316",
        bg2: "#1c1f24",
        panel: "rgba(28, 31, 36, 0.84)",
        ink: "#f5f5f7",
        muted: "rgba(217, 218, 223, 0.68)",
        accent: "#ff7a59",
        glow: "rgba(255, 122, 89, 0.18)",
      };
    default:
      return {
        bg: "#fff4e9",
        bg2: "#ffe0c4",
        panel: "rgba(255, 250, 243, 0.85)",
        ink: "#41210f",
        muted: "rgba(88, 52, 34, 0.72)",
        accent: "#ef6c3e",
        glow: "rgba(255, 171, 128, 0.26)",
      };
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

