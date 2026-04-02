const KEY = "clawdis.control.settings.v1";
const BUILD_DRAFTS_KEY = "clawdis.control.build-drafts.v1";
const BUILD_HISTORY_KEY = "clawdis.control.build-history.v1";
const IMPROVEMENT_IDEAS_KEY = "clawdis.control.improvement-ideas.v1";

import type { ThemeMode } from "./theme";

export type UiSettings = {
  gatewayUrl: string;
  token: string;
  sessionKey: string;
  theme: ThemeMode;
  brandName: string;
  assistantName: string;
  callMe: string;
  personality: string;
  inferenceMode: "api" | "local";
  apiModelRef: string;
  localBaseUrl: string;
  localModelId: string;
};

export type BuildDraftRecord = {
  id: string;
  name: string;
  prompt: string;
  palette: "sunrise" | "ocean" | "forest" | "graphite";
  layout: "dashboard" | "mobile" | "studio";
  screens: {
    home: string;
    details: string;
    settings: string;
  };
  css: string;
  js: string;
  updatedAt: number;
};

export type BuildHistoryEntry = {
  id: string;
  title: string;
  prompt: string;
  refinePrompt: string;
  palette: "sunrise" | "ocean" | "forest" | "graphite";
  layout: "dashboard" | "mobile" | "studio";
  screens: {
    home: string;
    details: string;
    settings: string;
  };
  css: string;
  js: string;
  createdAt: number;
  source: "starter" | "generate" | "refine" | "manual";
};

export type ImprovementIdea = {
  id: string;
  title: string;
  prompt: string;
  note: string;
  source: "core" | "talk";
  status: "suggested" | "approved" | "implemented";
  createdAt: number;
};

export function loadSettings(): UiSettings {
  const defaultUrl = (() => {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${location.host}`;
  })();

  const defaults: UiSettings = {
    gatewayUrl: defaultUrl,
    token: "",
    sessionKey: "main",
    theme: "system",
    brandName: "Miya",
    assistantName: "Miya",
    callMe: "",
    personality:
      "Warm, capable, calm, and everyday-friendly. Helpful without sounding robotic or overly technical.",
    inferenceMode: "api",
    apiModelRef: "gemini/gemini-2.5-flash",
    localBaseUrl: "http://127.0.0.1:11434/v1",
    localModelId: "gemma3:1b",
  };

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<UiSettings>;
    return {
      gatewayUrl:
        typeof parsed.gatewayUrl === "string" && parsed.gatewayUrl.trim()
          ? parsed.gatewayUrl.trim()
          : defaults.gatewayUrl,
      token: typeof parsed.token === "string" ? parsed.token : defaults.token,
      sessionKey:
        typeof parsed.sessionKey === "string" && parsed.sessionKey.trim()
          ? parsed.sessionKey.trim()
          : defaults.sessionKey,
      theme:
        parsed.theme === "light" ||
        parsed.theme === "dark" ||
        parsed.theme === "system"
          ? parsed.theme
          : defaults.theme,
      brandName:
        typeof parsed.brandName === "string" && parsed.brandName.trim()
          ? parsed.brandName.trim()
          : defaults.brandName,
      assistantName:
        typeof parsed.assistantName === "string" && parsed.assistantName.trim()
          ? parsed.assistantName.trim()
          : defaults.assistantName,
      callMe:
        typeof parsed.callMe === "string" ? parsed.callMe : defaults.callMe,
      personality:
        typeof parsed.personality === "string" && parsed.personality.trim()
          ? parsed.personality.trim()
          : defaults.personality,
      inferenceMode:
        parsed.inferenceMode === "local" || parsed.inferenceMode === "api"
          ? parsed.inferenceMode
          : defaults.inferenceMode,
      apiModelRef:
        typeof parsed.apiModelRef === "string" && parsed.apiModelRef.trim()
          ? parsed.apiModelRef.trim()
          : defaults.apiModelRef,
      localBaseUrl:
        typeof parsed.localBaseUrl === "string" && parsed.localBaseUrl.trim()
          ? parsed.localBaseUrl.trim()
          : defaults.localBaseUrl,
      localModelId:
        typeof parsed.localModelId === "string" && parsed.localModelId.trim()
          ? parsed.localModelId.trim()
          : defaults.localModelId,
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(next: UiSettings) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function loadBuildDrafts(): BuildDraftRecord[] {
  try {
    const raw = localStorage.getItem(BUILD_DRAFTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<BuildDraftRecord & { html?: string }>;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((draft) => ({
      ...draft,
      screens: draft.screens ?? {
        home: draft.html ?? "",
        details: draft.html ?? "",
        settings: draft.html ?? "",
      },
    }));
  } catch {
    return [];
  }
}

export function saveBuildDrafts(next: BuildDraftRecord[]) {
  localStorage.setItem(BUILD_DRAFTS_KEY, JSON.stringify(next));
}

export function loadBuildHistory(): BuildHistoryEntry[] {
  try {
    const raw = localStorage.getItem(BUILD_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BuildHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveBuildHistory(next: BuildHistoryEntry[]) {
  localStorage.setItem(BUILD_HISTORY_KEY, JSON.stringify(next));
}

export function loadImprovementIdeas(): ImprovementIdea[] {
  try {
    const raw = localStorage.getItem(IMPROVEMENT_IDEAS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ImprovementIdea[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveImprovementIdeas(next: ImprovementIdea[]) {
  localStorage.setItem(IMPROVEMENT_IDEAS_KEY, JSON.stringify(next));
}
