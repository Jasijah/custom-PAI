import { html } from "lit";

export type BrandProps = {
  brandName: string;
  assistantName: string;
};

export function renderBrand(props: BrandProps) {
  const brandName = props.brandName.trim() || "PAI";
  const assistantName = props.assistantName.trim() || "Miya";

  return html`
    <section class="grid grid-cols-2">
      <div class="card card-soft">
        <div class="section-title">Brand Kit</div>
        <div class="section-sub">
          A restrained biotech identity for ${brandName}, your shortcuts, and anything you shape in Build.
        </div>
        <div class="brand-kit-preview" style="margin-top: 16px;">
          <img src="/pai-logo.svg" alt="${brandName} logo" class="brand-kit-logo" />
        </div>
        <div class="chip-row" style="margin-top: 14px;">
          <a class="chip action" href="/pai-logo.svg" download="pai-logo.svg">Download logo</a>
          <a class="chip action" href="/pai-pattern.svg" download="pai-pattern.svg">Download pattern</a>
          <a class="chip action" href="/icon-512.svg" download="pai-icon-512.svg">Download app icon</a>
          <a class="chip action" href="/pai-shortcut.ico" download="pai-shortcut.ico">Download desktop icon</a>
        </div>
      </div>

      <div class="card card-soft">
        <div class="section-title">PAI Direction</div>
        <div class="section-sub">
          The visual language is calm, clinical, and premium without becoming cold or invasive.
        </div>
        <div class="stack brand-notes" style="margin-top: 16px;">
          <div class="list-item simple">
            <div class="list-main">
              <div class="list-title">Mood</div>
              <div class="list-sub">Biotech calm, precise but warm, quietly premium, easy to trust.</div>
            </div>
          </div>
          <div class="list-item simple">
            <div class="list-main">
              <div class="list-title">Palette</div>
              <div class="list-sub">Mineral greens, pale signal highlights, glassy panels, and soft contrast.</div>
            </div>
          </div>
          <div class="list-item simple">
            <div class="list-main">
              <div class="list-title">Visual language</div>
              <div class="list-sub">Cell rings, signal pathways, airy space, and subtle gradients rather than neon tech clutter.</div>
            </div>
          </div>
          <div class="callout">
            Use this when you want ${assistantName} or Build to create something that feels distinctly PAI.
          </div>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-2">
      <div class="card card-soft">
        <div class="section-title">Prompt Cues</div>
        <div class="section-sub">
          Handy language you can reuse when shaping new screens, images, or onboarding.
        </div>
        <div class="stack" style="margin-top: 16px;">
          <div class="callout brand-prompt">
            “Design this in the PAI biotech style: calm clinical greens, signal geometry, generous whitespace, and a premium everyday feel.”
          </div>
          <div class="callout brand-prompt">
            “Make it feel like a trusted personal AI, not a developer console.”
          </div>
          <div class="callout brand-prompt">
            “Keep the biotech cues subtle and elegant rather than loud or sci-fi.”
          </div>
        </div>
      </div>

      <div class="card card-soft">
        <div class="section-title">Where It Shows Up</div>
        <div class="section-sub">
          The brand system is already carried through key parts of the experience.
        </div>
        <div class="stack" style="margin-top: 16px;">
          <div class="list-item simple">
            <div class="list-main">
              <div class="list-title">Talk</div>
              <div class="list-sub">Calmer first-conversation framing and a softer daily workspace.</div>
            </div>
          </div>
          <div class="list-item simple">
            <div class="list-main">
              <div class="list-title">Build</div>
              <div class="list-sub">Optional PAI biotech layout mode for generated concepts and concept art.</div>
            </div>
          </div>
          <div class="list-item simple">
            <div class="list-main">
              <div class="list-title">Desktop</div>
              <div class="list-sub">PAI-branded shortcuts and non-invasive shortcut icons.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}
