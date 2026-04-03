import { html } from "lit";
import type { CognitiveState, MemoryItem, MemoryLayer, PrivacyLevel } from "../cognitive-store";

export function renderMemory(props: {
  cognitive: CognitiveState;
  results: MemoryItem[];
  query: string;
  onQueryChange: (next: string) => void;
  onCreate: (input: {
    title: string;
    body: string;
    layer: MemoryLayer;
    tags: string[];
    privacy: PrivacyLevel;
    importance: number;
    confidence: number;
    emotionalWeight: number;
    retentionUntil: number | null;
    source: string;
  }) => void;
}) {
  return html`
    <section class="card">
      <div class="card-title">Memory Vault</div>
      <div class="card-sub">L0-L5 memory layers with metadata, search and privacy.</div>
      <div class="filters" style="margin-top:12px;">
        <input
          style="min-width: 240px;"
          placeholder="Search memory..."
          .value=${props.query}
          @input=${(e: Event) => props.onQueryChange((e.target as HTMLInputElement).value)}
        />
      </div>
      <div class="table" style="margin-top: 12px;">
        <div class="table-head"><div>Layer</div><div>Title</div><div>Why retrieved</div></div>
        ${props.results.map((item) => renderMemoryRow(item))}
      </div>
    </section>

    <section class="card">
      <div class="card-title">Add Memory</div>
      <div class="grid grid-cols-2" style="margin-top:12px;">
        <label class="field"><span>Title</span><input id="mem-title" /></label>
        <label class="field"><span>Tags (comma)</span><input id="mem-tags" /></label>
        <label class="field full"><span>Body</span><textarea id="mem-body" rows="4"></textarea></label>
        <label class="field"><span>Layer</span><select id="mem-layer"><option>L0</option><option>L1</option><option>L2</option><option>L3</option><option>L4</option><option>L5</option></select></label>
        <label class="field"><span>Privacy</span><select id="mem-privacy"><option>low</option><option>medium</option><option>high</option></select></label>
        <button class="btn primary" @click=${() => {
          const title = (document.getElementById("mem-title") as HTMLInputElement | null)?.value?.trim() ?? "";
          const body = (document.getElementById("mem-body") as HTMLTextAreaElement | null)?.value?.trim() ?? "";
          if (!title || !body) return;
          const tagsRaw = (document.getElementById("mem-tags") as HTMLInputElement | null)?.value ?? "";
          const layer = ((document.getElementById("mem-layer") as HTMLSelectElement | null)?.value ?? "L1") as MemoryLayer;
          const privacy = ((document.getElementById("mem-privacy") as HTMLSelectElement | null)?.value ?? "medium") as PrivacyLevel;
          props.onCreate({
            title,
            body,
            layer,
            tags: tagsRaw.split(",").map((x) => x.trim()).filter(Boolean),
            privacy,
            importance: 0.5,
            confidence: 0.7,
            emotionalWeight: 0.5,
            retentionUntil: null,
            source: "manual",
          });
        }}>Save Memory</button>
      </div>
    </section>
  `;
}

function renderMemoryRow(item: MemoryItem) {
  const why = `matched tags=${item.tags.join(",") || "none"}, recency=${new Date(item.timestamp).toLocaleDateString()}, importance=${item.importance.toFixed(2)}`;
  return html`<div class="table-row"><div>${item.layer}</div><div>${item.title}</div><div class="muted">${why}</div></div>`;
}
