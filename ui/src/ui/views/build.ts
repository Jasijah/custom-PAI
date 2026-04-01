import { html } from "lit";

export type BuildProps = {
  title: string;
  prompt: string;
  palette: "sunrise" | "ocean" | "forest" | "graphite";
  layout: "dashboard" | "mobile" | "studio";
  onTitleChange: (next: string) => void;
  onPromptChange: (next: string) => void;
  onPaletteChange: (next: BuildProps["palette"]) => void;
  onLayoutChange: (next: BuildProps["layout"]) => void;
};

type BuildDraft = {
  html: string;
  css: string;
  js: string;
  preview: string;
};

const QUICK_IDEAS = [
  "A habit tracker for mornings and evenings",
  "A meal planner with grocery highlights",
  "A couple's shared trip board with countdown",
  "A kid-friendly homework dashboard",
];

export function renderBuild(props: BuildProps) {
  const draft = buildDraftFromPrompt(props);

  return html`
    <section class="builder-shell">
      <div class="builder-hero">
        <div>
          <div class="builder-hero__eyebrow">Studio</div>
          <h2>Shape app ideas and preview them live.</h2>
          <p>Describe the experience you want, tune the feel, and watch the concept update inside the UI.</p>
        </div>
        <div class="builder-hero__meta">
          <div class="hero-stat">
            <div class="hero-stat__label">Mode</div>
            <div class="hero-stat__value">Live preview</div>
            <div class="hero-stat__sub">Updates inside the assistant interface</div>
          </div>
        </div>
      </div>

      <div class="builder-workspace">
        <section class="builder-panel">
          <div class="section-title">Prompt</div>
          <div class="section-sub">Describe what you want to build. The studio will shape a polished starter for you.</div>

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
                  props.onPaletteChange((event.target as HTMLSelectElement).value as BuildProps["palette"])}
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
                  props.onLayoutChange((event.target as HTMLSelectElement).value as BuildProps["layout"])}
              >
                <option value="dashboard">Dashboard</option>
                <option value="mobile">Mobile app</option>
                <option value="studio">Studio board</option>
              </select>
            </label>
          </div>
        </section>

        <section class="builder-preview">
          <div class="builder-preview__header">
            <div>
              <div class="section-title">Preview</div>
              <div class="section-sub">A live concept view inspired by Gemini and AI Studio workflows.</div>
            </div>
            <div class="builder-preview__dots">
              <span></span><span></span><span></span>
            </div>
          </div>
          <iframe
            class="builder-preview__frame"
            title="App preview"
            srcdoc=${draft.preview}
          ></iframe>
        </section>
      </div>

      <section class="builder-code">
        <div class="builder-code__block">
          <div class="section-title">HTML</div>
          <pre class="code-block">${draft.html}</pre>
        </div>
        <div class="builder-code__block">
          <div class="section-title">CSS</div>
          <pre class="code-block">${draft.css}</pre>
        </div>
        <div class="builder-code__block">
          <div class="section-title">JS</div>
          <pre class="code-block">${draft.js}</pre>
        </div>
      </section>
    </section>
  `;
}

function buildDraftFromPrompt(props: BuildProps): BuildDraft {
  const title = props.title.trim() || "New App";
  const summary = summarizePrompt(props.prompt);
  const palette = paletteFor(props.palette);
  const cards = cardCopy(summary);

  const html = `<main class="app-shell layout-${props.layout}">
  <header class="hero">
    <span class="eyebrow">${labelForLayout(props.layout)}</span>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(summary)}</p>
  </header>
  <section class="feature-grid">
    <article class="feature-card">
      <span class="feature-label">Focus</span>
      <h2>${escapeHtml(cards.primaryTitle)}</h2>
      <p>${escapeHtml(cards.primaryBody)}</p>
    </article>
    <article class="feature-card">
      <span class="feature-label">Flow</span>
      <h2>${escapeHtml(cards.secondaryTitle)}</h2>
      <p>${escapeHtml(cards.secondaryBody)}</p>
    </article>
    <article class="feature-card wide">
      <span class="feature-label">Preview</span>
      <h2>Built for real use</h2>
      <p>This concept keeps the layout simple, warm, and easy to scan while leaving room for richer interactions later.</p>
      <button class="primary-action">Continue</button>
    </article>
  </section>
</main>`;

  const css = `:root {
  --bg: ${palette.bg};
  --panel: ${palette.panel};
  --ink: ${palette.ink};
  --muted: ${palette.muted};
  --accent: ${palette.accent};
  --accent-soft: ${palette.soft};
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

.app-shell {
  min-height: 100vh;
  padding: 28px;
}

.hero h1 {
  margin: 10px 0 8px;
  font-size: clamp(2.2rem, 5vw, 3.8rem);
  line-height: 0.98;
}

.hero p {
  max-width: 56ch;
  color: var(--muted);
}

.eyebrow, .feature-label {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.72rem;
  color: var(--accent);
}

.feature-grid {
  display: grid;
  gap: 18px;
  margin-top: 28px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.layout-mobile .feature-grid {
  grid-template-columns: 1fr;
  max-width: 420px;
}

.layout-studio .feature-grid {
  grid-template-columns: 1.2fr 0.8fr;
}

.feature-card {
  padding: 22px;
  border-radius: 28px;
  background: var(--panel);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 20px 50px rgba(0,0,0,0.12);
}

.feature-card.wide {
  grid-column: 1 / -1;
}

.primary-action {
  margin-top: 16px;
  border: 0;
  border-radius: 999px;
  padding: 12px 18px;
  background: var(--accent);
  color: white;
  font-weight: 600;
}`;

  const js = `const state = {
  title: "${escapeJs(title)}",
  summary: "${escapeJs(summary)}",
  layout: "${props.layout}",
  palette: "${props.palette}"
};

console.log("Builder preview ready", state);`;

  const preview = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>${css}</style>
  </head>
  <body>
    ${html}
    <script>${js}<\/script>
  </body>
</html>`;

  return { html, css, js, preview };
}

function summarizePrompt(prompt: string) {
  const trimmed = prompt.trim();
  if (!trimmed) return "A polished assistant-built app concept with a clean layout and a clear next step.";
  return trimmed.length > 160 ? `${trimmed.slice(0, 157)}...` : trimmed;
}

function cardCopy(summary: string) {
  return {
    primaryTitle: "A calmer first screen",
    primaryBody: `Lead with the most useful job to be done, then support it with just enough detail. ${summary}`,
    secondaryTitle: "A preview that feels real",
    secondaryBody: "Use stronger type, warmer spacing, and a focused call to action so the concept looks product-ready, not like a wireframe.",
  };
}

function labelForLayout(layout: BuildProps["layout"]) {
  switch (layout) {
    case "mobile":
      return "Mobile concept";
    case "studio":
      return "Studio board";
    default:
      return "Product concept";
  }
}

function paletteFor(palette: BuildProps["palette"]) {
  switch (palette) {
    case "ocean":
      return {
        bg: "#061a2c",
        bg2: "#0e2740",
        panel: "rgba(10, 28, 44, 0.82)",
        ink: "#ecf8ff",
        muted: "rgba(214, 237, 247, 0.72)",
        accent: "#4cc9f0",
        soft: "rgba(76, 201, 240, 0.18)",
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
        soft: "rgba(87, 204, 153, 0.18)",
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
        soft: "rgba(255, 122, 89, 0.18)",
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
        soft: "rgba(239, 108, 62, 0.16)",
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

function escapeJs(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n");
}
