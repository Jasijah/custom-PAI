const KEY = "clawdis.control.settings.v1";
const BUILD_DRAFTS_KEY = "clawdis.control.build-drafts.v1";

import type { ThemeMode } from "./theme";

export type UiSettings = {
  gatewayUrl: string;
  token: string;
  sessionKey: string;
  theme: ThemeMode;
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
