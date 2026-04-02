import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import { GatewayBrowserClient, type GatewayEventFrame, type GatewayHelloOk } from "./gateway";
import {
  loadBuildDrafts,
  loadSettings,
  saveBuildDrafts,
  saveSettings,
  type BuildDraftRecord,
  type UiSettings,
} from "./storage";
import { renderApp } from "./app-render";
import { normalizePath, pathForTab, tabFromPath, type Tab } from "./navigation";
import {
  buildStructuredExportFiles,
  createStarterBuild,
  parseGeneratedBuildResponse,
  type BuildScreenId,
  type BuildCode,
} from "./views/build";
import {
  resolveTheme,
  type ResolvedTheme,
  type ThemeMode,
} from "./theme";
import {
  startThemeTransition,
  type ThemeTransitionContext,
} from "./theme-transition";
import type {
  ConfigSnapshot,
  CronJob,
  CronRunLogEntry,
  CronStatus,
  HealthSnapshot,
  PresenceEntry,
  ProvidersStatusSnapshot,
  SessionsListResult,
  SkillStatusReport,
  StatusSummary,
} from "./types";
import {
  defaultDiscordActions,
  type CronFormState,
  type DiscordForm,
  type IMessageForm,
  type SignalForm,
  type TelegramForm,
} from "./ui-types";
import {
  loadChatHistory,
  sendChat,
  handleChatEvent,
  type ChatEventPayload,
} from "./controllers/chat";
import { loadNodes } from "./controllers/nodes";
import { loadConfig } from "./controllers/config";
import {
  loadProviders,
  logoutWhatsApp,
  saveDiscordConfig,
  saveIMessageConfig,
  saveSignalConfig,
  saveTelegramConfig,
  startWhatsAppLogin,
  waitWhatsAppLogin,
} from "./controllers/connections";
import { loadPresence } from "./controllers/presence";
import { loadSessions } from "./controllers/sessions";
import {
  loadCronJobs,
  loadCronStatus,
} from "./controllers/cron";
import {
  loadSkills,
} from "./controllers/skills";
import { loadDebug } from "./controllers/debug";
import {
  appendAudit,
  createActionCard,
  createMemory,
  loadCognitiveState,
  permissionEnabled,
  reflectAction,
  runAgents,
  saveCognitiveState,
  searchMemory,
  updateAction,
  updatePermission,
  type CognitiveState,
  type GrantDuration,
  type MemoryLayer,
  type PrivacyLevel,
  type VoicePrefs,
} from "./cognitive-store";
import { synthesizeSpeech } from "./tts";
import { generateUUID } from "./uuid";

type EventLogEntry = {
  ts: number;
  event: string;
  payload?: unknown;
};

const DEFAULT_CRON_FORM: CronFormState = {
  name: "",
  description: "",
  enabled: true,
  scheduleKind: "every",
  scheduleAt: "",
  everyAmount: "30",
  everyUnit: "minutes",
  cronExpr: "0 7 * * *",
  cronTz: "",
  sessionTarget: "main",
  wakeMode: "next-heartbeat",
  payloadKind: "systemEvent",
  payloadText: "",
  deliver: false,
  channel: "last",
  to: "",
  timeoutSeconds: "",
  postToMainPrefix: "",
};

@customElement("clawdis-app")
export class ClawdisApp extends LitElement {
  @state() settings: UiSettings = loadSettings();
  @state() password = "";
  @state() tab: Tab = "chat";
  @state() connected = false;
  @state() theme: ThemeMode = this.settings.theme ?? "system";
  @state() themeResolved: ResolvedTheme = "dark";
  @state() hello: GatewayHelloOk | null = null;
  @state() lastError: string | null = null;
  @state() eventLog: EventLogEntry[] = [];
  @state() paletteOpen = false;
  @state() paletteQuery = "";

  @state() sessionKey = this.settings.sessionKey;
  @state() chatLoading = false;
  @state() chatSending = false;
  @state() chatMessage = "";
  @state() chatMessages: unknown[] = [];
  @state() chatStream: string | null = null;
  @state() chatRunId: string | null = null;
  @state() chatThinkingLevel: string | null = null;
  @state() buildPrompt = "Create a warm daily planner app with a focus timer, mood check-in, and a progress overview.";
  @state() buildTitle = "Daily Planner";
  @state() buildPalette: "sunrise" | "ocean" | "forest" | "graphite" = "sunrise";
  @state() buildLayout: "dashboard" | "mobile" | "studio" = "dashboard";
  @state() buildCode: BuildCode = createStarterBuild({
    title: "Daily Planner",
    prompt: "Create a warm daily planner app with a focus timer, mood check-in, and a progress overview.",
    palette: "sunrise",
    layout: "dashboard",
  });
  @state() buildDrafts: BuildDraftRecord[] = loadBuildDrafts();
  @state() buildSelectedDraftId: string | null = null;
  @state() buildActiveScreen: BuildScreenId = "home";
  @state() buildGenerating = false;
  @state() buildStatus: string | null = null;

  @state() cognitive: CognitiveState = loadCognitiveState();
  @state() memoryQuery = "";
  @state() voiceListening = false;
  @state() voiceSupported = false;
  @state() voiceInterim = "";

  @state() nodesLoading = false;
  @state() nodes: Array<Record<string, unknown>> = [];

  @state() configLoading = false;
  @state() configRaw = "{\n}\n";
  @state() configValid: boolean | null = null;
  @state() configIssues: unknown[] = [];
  @state() configSaving = false;
  @state() configSnapshot: ConfigSnapshot | null = null;

  @state() providersLoading = false;
  @state() providersSnapshot: ProvidersStatusSnapshot | null = null;
  @state() providersError: string | null = null;
  @state() providersLastSuccess: number | null = null;
  @state() whatsappLoginMessage: string | null = null;
  @state() whatsappLoginQrDataUrl: string | null = null;
  @state() whatsappLoginConnected: boolean | null = null;
  @state() whatsappBusy = false;
  @state() telegramForm: TelegramForm = {
    token: "",
    requireMention: true,
    allowFrom: "",
    proxy: "",
    webhookUrl: "",
    webhookSecret: "",
    webhookPath: "",
  };
  @state() telegramSaving = false;
  @state() telegramTokenLocked = false;
  @state() telegramConfigStatus: string | null = null;
  @state() discordForm: DiscordForm = {
    enabled: true,
    token: "",
    dmEnabled: true,
    allowFrom: "",
    groupEnabled: false,
    groupChannels: "",
    mediaMaxMb: "",
    historyLimit: "",
    textChunkLimit: "",
    replyToMode: "off",
    guilds: [],
    actions: { ...defaultDiscordActions },
    slashEnabled: false,
    slashName: "",
    slashSessionPrefix: "",
    slashEphemeral: true,
  };
  @state() discordSaving = false;
  @state() discordTokenLocked = false;
  @state() discordConfigStatus: string | null = null;
  @state() signalForm: SignalForm = {
    enabled: true,
    account: "",
    httpUrl: "",
    httpHost: "",
    httpPort: "",
    cliPath: "",
    autoStart: true,
    receiveMode: "",
    ignoreAttachments: false,
    ignoreStories: false,
    sendReadReceipts: false,
    allowFrom: "",
    mediaMaxMb: "",
  };
  @state() signalSaving = false;
  @state() signalConfigStatus: string | null = null;
  @state() imessageForm: IMessageForm = {
    enabled: true,
    cliPath: "",
    dbPath: "",
    service: "auto",
    region: "",
    allowFrom: "",
    includeAttachments: false,
    mediaMaxMb: "",
  };
  @state() imessageSaving = false;
  @state() imessageConfigStatus: string | null = null;

  @state() presenceLoading = false;
  @state() presenceEntries: PresenceEntry[] = [];
  @state() presenceError: string | null = null;
  @state() presenceStatus: string | null = null;

  @state() sessionsLoading = false;
  @state() sessionsResult: SessionsListResult | null = null;
  @state() sessionsError: string | null = null;
  @state() sessionsFilterActive = "";
  @state() sessionsFilterLimit = "120";
  @state() sessionsIncludeGlobal = true;
  @state() sessionsIncludeUnknown = false;

  @state() cronLoading = false;
  @state() cronJobs: CronJob[] = [];
  @state() cronStatus: CronStatus | null = null;
  @state() cronError: string | null = null;
  @state() cronForm: CronFormState = { ...DEFAULT_CRON_FORM };
  @state() cronRunsJobId: string | null = null;
  @state() cronRuns: CronRunLogEntry[] = [];
  @state() cronBusy = false;

  @state() skillsLoading = false;
  @state() skillsReport: SkillStatusReport | null = null;
  @state() skillsError: string | null = null;
  @state() skillsFilter = "";
  @state() skillEdits: Record<string, string> = {};
  @state() skillsBusyKey: string | null = null;

  @state() debugLoading = false;
  @state() debugStatus: StatusSummary | null = null;
  @state() debugHealth: HealthSnapshot | null = null;
  @state() debugModels: unknown[] = [];
  @state() debugHeartbeat: unknown | null = null;
  @state() debugCallMethod = "";
  @state() debugCallParams = "{}";
  @state() debugCallResult: string | null = null;
  @state() debugCallError: string | null = null;

  client: GatewayBrowserClient | null = null;
  private chatScrollFrame: number | null = null;
  private chatScrollTimeout: number | null = null;
  private nodesPollInterval: number | null = null;
  basePath = "";
  private popStateHandler = () => this.onPopState();
  private keyDownHandler = (event: KeyboardEvent) => this.onKeyDown(event);
  private themeMedia: MediaQueryList | null = null;
  private themeMediaHandler: ((event: MediaQueryListEvent) => void) | null = null;
  private speechRec: { stop: () => void } | null = null;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.basePath = this.inferBasePath();
    this.syncTabWithLocation(true);
    this.syncThemeWithSettings();
    this.attachThemeListener();
    window.addEventListener("popstate", this.popStateHandler);
    window.addEventListener("keydown", this.keyDownHandler);
    this.applySettingsFromUrl();
    this.connect();
    this.startNodesPolling();
    this.voiceSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  }

  disconnectedCallback() {
    window.removeEventListener("popstate", this.popStateHandler);
    window.removeEventListener("keydown", this.keyDownHandler);
    this.stopNodesPolling();
    this.detachThemeListener();
    super.disconnectedCallback();
  }

  protected updated(changed: Map<PropertyKey, unknown>) {
    if (
      this.tab === "chat" &&
      (changed.has("chatMessages") ||
        changed.has("chatStream") ||
        changed.has("chatLoading") ||
        changed.has("chatMessage") ||
        changed.has("tab"))
    ) {
      this.scheduleChatScroll();
    }
  }

  connect() {
    this.lastError = null;
    this.hello = null;
    this.connected = false;

    this.client?.stop();
    this.client = new GatewayBrowserClient({
      url: this.settings.gatewayUrl,
      token: this.settings.token.trim() ? this.settings.token : undefined,
      password: this.password.trim() ? this.password : undefined,
      clientName: "clawdis-control-ui",
      mode: "webchat",
      onHello: (hello) => {
        this.connected = true;
        this.hello = hello;
        this.applySnapshot(hello);
        if (this.cognitive.voice.announceOnline) {
          void this.speak("Personal AI is online and ready.");
        }
        void loadNodes(this, { quiet: true });
        void this.refreshActiveTab();
      },
      onClose: ({ code, reason }) => {
        this.connected = false;
        this.lastError = `disconnected (${code}): ${reason || "no reason"}`;
      },
      onEvent: (evt) => this.onEvent(evt),
      onGap: ({ expected, received }) => {
        this.lastError = `event gap detected (expected seq ${expected}, got ${received}); refresh recommended`;
      },
    });
    this.client.start();
  }

  private scheduleChatScroll() {
    if (this.chatScrollFrame) cancelAnimationFrame(this.chatScrollFrame);
    if (this.chatScrollTimeout != null) {
      clearTimeout(this.chatScrollTimeout);
      this.chatScrollTimeout = null;
    }
    this.chatScrollFrame = requestAnimationFrame(() => {
      this.chatScrollFrame = null;
      const container = this.querySelector(".chat-thread") as HTMLElement | null;
      if (!container) return;
      container.scrollTop = container.scrollHeight;
      this.chatScrollTimeout = window.setTimeout(() => {
        this.chatScrollTimeout = null;
        const latest = this.querySelector(".chat-thread") as HTMLElement | null;
        if (!latest) return;
        latest.scrollTop = latest.scrollHeight;
      }, 120);
    });
  }

  private startNodesPolling() {
    if (this.nodesPollInterval != null) return;
    this.nodesPollInterval = window.setInterval(
      () => void loadNodes(this, { quiet: true }),
      5000,
    );
  }

  private stopNodesPolling() {
    if (this.nodesPollInterval == null) return;
    clearInterval(this.nodesPollInterval);
    this.nodesPollInterval = null;
  }

  private hasConnectedMobileNode() {
    return this.nodes.some((n) => {
      if (!Boolean(n.connected)) return false;
      const p =
        typeof n.platform === "string" ? n.platform.trim().toLowerCase() : "";
      return (
        p.startsWith("ios") || p.startsWith("ipados") || p.startsWith("android")
      );
    });
  }

  private onEvent(evt: GatewayEventFrame) {
    this.eventLog = [
      { ts: Date.now(), event: evt.event, payload: evt.payload },
      ...this.eventLog,
    ].slice(0, 250);

    if (evt.event === "chat") {
      const payload = evt.payload as ChatEventPayload | undefined;
      const state = handleChatEvent(this, payload);
      if (state === "final") {
        if (this.cognitive.voice.autoRead) {
          const last = [...this.chatMessages].reverse().find((entry) => {
            const row = entry as Record<string, unknown>;
            return row.role === "assistant";
          }) as Record<string, unknown> | undefined;
          const content = typeof last?.content === "string" ? last.content : "";
          if (content) void this.speak(content);
        }
        void loadChatHistory(this);
      }
      return;
    }

    if (evt.event === "presence") {
      const payload = evt.payload as { presence?: PresenceEntry[] } | undefined;
      if (payload?.presence && Array.isArray(payload.presence)) {
        this.presenceEntries = payload.presence;
        this.presenceError = null;
        this.presenceStatus = null;
      }
      return;
    }

    if (evt.event === "cron" && this.tab === "cron") {
      void this.loadCron();
    }
  }

  private applySnapshot(hello: GatewayHelloOk) {
    const snapshot = hello.snapshot as
      | { presence?: PresenceEntry[]; health?: HealthSnapshot }
      | undefined;
    if (snapshot?.presence && Array.isArray(snapshot.presence)) {
      this.presenceEntries = snapshot.presence;
    }
    if (snapshot?.health) {
      this.debugHealth = snapshot.health;
    }
  }

  applySettings(next: UiSettings) {
    this.settings = next;
    saveSettings(next);
    if (next.theme !== this.theme) {
      this.theme = next.theme;
      this.applyResolvedTheme(resolveTheme(next.theme));
    }
  }

  private applySettingsFromUrl() {
    if (!window.location.search) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token")?.trim();
    if (!token) return;
    if (!this.settings.token) {
      this.applySettings({ ...this.settings, token });
    }
    params.delete("token");
    const url = new URL(window.location.href);
    url.search = params.toString();
    window.history.replaceState({}, "", url.toString());
  }

  setTab(next: Tab) {
    if (this.tab !== next) this.tab = next;
    this.paletteOpen = false;
    this.paletteQuery = "";
    void this.refreshActiveTab();
    this.syncUrlWithTab(next, false);
  }

  openPalette() {
    this.paletteOpen = true;
  }

  closePalette() {
    this.paletteOpen = false;
    this.paletteQuery = "";
  }

  setTheme(next: ThemeMode, context?: ThemeTransitionContext) {
    const applyTheme = () => {
      this.theme = next;
      this.applySettings({ ...this.settings, theme: next });
      this.applyResolvedTheme(resolveTheme(next));
    };
    startThemeTransition({
      nextTheme: next,
      applyTheme,
      context,
      currentTheme: this.theme,
    });
  }

  private async refreshActiveTab() {
    if (this.tab === "overview") await this.loadOverview();
    if (this.tab === "connections") await this.loadConnections();
    if (this.tab === "instances") await loadPresence(this);
    if (this.tab === "sessions") await loadSessions(this);
    if (this.tab === "cron") await this.loadCron();
    if (this.tab === "skills") await loadSkills(this);
    if (this.tab === "nodes") await loadNodes(this);
    if (this.tab === "chat") {
      await Promise.all([loadChatHistory(this), loadSessions(this)]);
      this.scheduleChatScroll();
    }
    if (this.tab === "build") return;
    if (this.tab === "config") await loadConfig(this);
    if (this.tab === "debug") await loadDebug(this);
  }

  private inferBasePath() {
    if (typeof window === "undefined") return "";
    const path = window.location.pathname;
    if (path === "/ui" || path.startsWith("/ui/")) return "/ui";
    return "";
  }

  private syncThemeWithSettings() {
    this.theme = this.settings.theme ?? "system";
    this.applyResolvedTheme(resolveTheme(this.theme));
  }

  private applyResolvedTheme(resolved: ResolvedTheme) {
    this.themeResolved = resolved;
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
  }

  private attachThemeListener() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function")
      return;
    this.themeMedia = window.matchMedia("(prefers-color-scheme: dark)");
    this.themeMediaHandler = (event) => {
      if (this.theme !== "system") return;
      this.applyResolvedTheme(event.matches ? "dark" : "light");
    };
    if (typeof this.themeMedia.addEventListener === "function") {
      this.themeMedia.addEventListener("change", this.themeMediaHandler);
      return;
    }
    const legacy = this.themeMedia as MediaQueryList & {
      addListener: (cb: (event: MediaQueryListEvent) => void) => void;
    };
    legacy.addListener(this.themeMediaHandler);
  }

  private detachThemeListener() {
    if (!this.themeMedia || !this.themeMediaHandler) return;
    if (typeof this.themeMedia.removeEventListener === "function") {
      this.themeMedia.removeEventListener("change", this.themeMediaHandler);
      return;
    }
    const legacy = this.themeMedia as MediaQueryList & {
      removeListener: (cb: (event: MediaQueryListEvent) => void) => void;
    };
    legacy.removeListener(this.themeMediaHandler);
    this.themeMedia = null;
    this.themeMediaHandler = null;
  }

  private syncTabWithLocation(replace: boolean) {
    if (typeof window === "undefined") return;
    const resolved = tabFromPath(window.location.pathname, this.basePath) ?? "chat";
    this.setTabFromRoute(resolved);
    this.syncUrlWithTab(resolved, replace);
  }

  private onPopState() {
    if (typeof window === "undefined") return;
    const resolved = tabFromPath(window.location.pathname, this.basePath);
    if (!resolved) return;
    this.setTabFromRoute(resolved);
  }

  private onKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    const editable =
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      target?.isContentEditable;

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      this.paletteOpen = true;
      return;
    }

    if (!this.paletteOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      this.closePalette();
      return;
    }

    if (editable) return;
  }

  private setTabFromRoute(next: Tab) {
    if (this.tab !== next) this.tab = next;
    if (this.connected) void this.refreshActiveTab();
  }

  private syncUrlWithTab(tab: Tab, replace: boolean) {
    if (typeof window === "undefined") return;
    const targetPath = normalizePath(pathForTab(tab, this.basePath));
    const currentPath = normalizePath(window.location.pathname);
    if (currentPath === targetPath) return;
    const url = new URL(window.location.href);
    url.pathname = targetPath;
    if (replace) {
      window.history.replaceState({}, "", url.toString());
    } else {
      window.history.pushState({}, "", url.toString());
    }
  }

  async loadOverview() {
    await Promise.all([
      loadProviders(this, false),
      loadPresence(this),
      loadSessions(this),
      loadCronStatus(this),
      loadDebug(this),
    ]);
  }

  private async loadConnections() {
    await Promise.all([loadProviders(this, true), loadConfig(this)]);
  }

  async loadCron() {
    await Promise.all([loadCronStatus(this), loadCronJobs(this)]);
  }

  async handleSendChat() {
    if (!this.connected || !this.hasConnectedMobileNode()) return;
    const seed = this.chatMessage;
    await sendChat(this);
    if (seed.trim()) this.createSuggestionFromChat(seed);
    void loadChatHistory(this);
  }

  async handleWhatsAppStart(force: boolean) {
    await startWhatsAppLogin(this, force);
    await loadProviders(this, true);
  }

  async handleWhatsAppWait() {
    await waitWhatsAppLogin(this);
    await loadProviders(this, true);
  }

  async handleWhatsAppLogout() {
    await logoutWhatsApp(this);
    await loadProviders(this, true);
  }

  async handleTelegramSave() {
    await saveTelegramConfig(this);
    await loadConfig(this);
    await loadProviders(this, true);
  }

  async handleDiscordSave() {
    await saveDiscordConfig(this);
    await loadConfig(this);
    await loadProviders(this, true);
  }

  async handleSignalSave() {
    await saveSignalConfig(this);
    await loadConfig(this);
    await loadProviders(this, true);
  }

  async handleIMessageSave() {
    await saveIMessageConfig(this);
    await loadConfig(this);
    await loadProviders(this, true);
  }

  async handleBuildGenerate() {
    if (!this.client || !this.connected) {
      this.buildStatus = "Connect to the gateway before generating with Gemini.";
      return;
    }

    this.buildGenerating = true;
    this.buildStatus = "Asking Gemini to generate app code...";
    const sessionKey = "__builder__";
    const beforeHistory = (await this.client.request("chat.history", {
      sessionKey,
      limit: 50,
    }).catch(() => ({ messages: [] }))) as { messages?: unknown[] };
    const beforeCount = Array.isArray(beforeHistory.messages) ? beforeHistory.messages.length : 0;

    const prompt = [
      "You are generating a lightweight web app prototype.",
      `App name: ${this.buildTitle || "New App"}`,
      `Palette: ${this.buildPalette}`,
      `Layout: ${this.buildLayout}`,
      `Prompt: ${this.buildPrompt}`,
      'Return strict JSON only with keys "title", "screens", "css", and "js".',
      'The "screens" object must include "home", "details", and "settings", each containing only body markup for that screen.',
      "The css should be complete and shared across screens. The js should be browser-safe and optional.",
      "Do not wrap the JSON in markdown.",
    ].join("\n");

    try {
      await this.client.request("chat.send", {
        sessionKey,
        message: prompt,
        deliver: false,
        idempotencyKey: generateUUID(),
      });

      let assistantText: string | null = null;
      for (let attempt = 0; attempt < 18; attempt += 1) {
        await delay(1200);
        const history = (await this.client.request("chat.history", {
          sessionKey,
          limit: 50,
        })) as { messages?: unknown[] };
        const messages = Array.isArray(history.messages) ? history.messages : [];
        if (messages.length <= beforeCount) continue;
        const assistant = [...messages]
          .reverse()
          .find((entry) => (entry as Record<string, unknown>).role === "assistant");
        assistantText = extractMessageText(assistant);
        if (assistantText) break;
      }

      if (!assistantText) {
        this.buildStatus = "Gemini did not return app code yet. Try again in a moment.";
        return;
      }

      const parsed = parseGeneratedBuildResponse(assistantText);
      const nextScreens = parsed?.screens ?? null;
      if ((!nextScreens?.home && !parsed?.html) || !parsed?.css) {
        this.buildStatus = "Gemini responded, but the code could not be parsed cleanly. You can still edit the current draft.";
        return;
      }

      this.buildTitle = parsed.title?.trim() || this.buildTitle;
      this.buildCode = {
        screens: {
          home: nextScreens?.home ?? parsed.html ?? this.buildCode.screens.home,
          details: nextScreens?.details ?? nextScreens?.home ?? parsed.html ?? this.buildCode.screens.details,
          settings: nextScreens?.settings ?? nextScreens?.home ?? parsed.html ?? this.buildCode.screens.settings,
        },
        css: parsed.css,
        js: parsed.js ?? "",
      };
      this.buildStatus = "Gemini generated a fresh app concept. You can now edit, save, or export it.";
    } catch (err) {
      this.buildStatus = `Build generation failed: ${String(err)}`;
    } finally {
      this.buildGenerating = false;
    }
  }

  handleBuildSaveDraft() {
    const id = this.buildSelectedDraftId ?? generateUUID();
    const next: BuildDraftRecord = {
      id,
      name: this.buildTitle.trim() || "Untitled app",
      prompt: this.buildPrompt,
      palette: this.buildPalette,
      layout: this.buildLayout,
      screens: this.buildCode.screens,
      css: this.buildCode.css,
      js: this.buildCode.js,
      updatedAt: Date.now(),
    };
    const remaining = this.buildDrafts.filter((draft) => draft.id !== id);
    this.buildDrafts = [next, ...remaining].sort((a, b) => b.updatedAt - a.updatedAt);
    this.buildSelectedDraftId = id;
    saveBuildDrafts(this.buildDrafts);
    this.buildStatus = "Draft saved locally.";
  }

  handleBuildSelectDraft(id: string) {
    const draft = this.buildDrafts.find((entry) => entry.id === id);
    if (!draft) return;
    this.buildSelectedDraftId = draft.id;
    this.buildTitle = draft.name;
    this.buildPrompt = draft.prompt;
    this.buildPalette = draft.palette;
    this.buildLayout = draft.layout;
    this.buildCode = {
      screens: draft.screens,
      css: draft.css,
      js: draft.js,
    };
    this.buildStatus = `Loaded "${draft.name}".`;
  }

  handleBuildDeleteDraft(id: string) {
    this.buildDrafts = this.buildDrafts.filter((entry) => entry.id !== id);
    if (this.buildSelectedDraftId === id) this.buildSelectedDraftId = null;
    saveBuildDrafts(this.buildDrafts);
    this.buildStatus = "Draft removed.";
  }

  handleBuildNewDraft() {
    this.buildSelectedDraftId = null;
    this.buildTitle = "New App";
    this.buildPrompt = "Create a polished app concept with a welcoming first screen and a clear next step.";
    this.buildPalette = "sunrise";
    this.buildLayout = "dashboard";
    this.buildCode = createStarterBuild({
      title: this.buildTitle,
      prompt: this.buildPrompt,
      palette: this.buildPalette,
      layout: this.buildLayout,
    });
    this.buildStatus = "Started a fresh draft.";
  }

  handleBuildExport() {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const slug = (this.buildTitle || "app").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "app";
    const files = buildStructuredExportFiles(this.buildCode);
    for (const [name, contents] of Object.entries(files)) {
      const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slug}-${name}`;
      link.click();
      URL.revokeObjectURL(url);
    }
    this.buildStatus = "Exported structured files for all three screens.";
  }

  async handleBuildScaffold() {
    if (!this.client || !this.connected) {
      this.buildStatus = "Connect to the gateway before creating a repo app.";
      return;
    }
    const slug =
      (this.buildTitle || "app")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "app";
    try {
      const res = (await this.client.request("builder.scaffold", {
        title: this.buildTitle,
        slug,
        screens: this.buildCode.screens,
        css: this.buildCode.css,
        js: this.buildCode.js,
        overwrite: true,
      })) as { path?: string; files?: string[] };
      this.buildStatus = `Created Vite app scaffold in ${res.path ?? `apps/generated/${slug}`}.`;
    } catch (err) {
      this.buildStatus = `Repo scaffold failed: ${String(err)}`;
    }
  }


  private persistCognitive(next: CognitiveState) {
    this.cognitive = next;
    saveCognitiveState(next);
  }

  memoryResults() {
    return searchMemory(this.cognitive, this.memoryQuery);
  }

  handlePermission(scope: Parameters<typeof updatePermission>[1], enabled: boolean, duration: GrantDuration) {
    let next = updatePermission(this.cognitive, scope, enabled, duration);
    next = appendAudit(next, "action.executed", `${scope}:${enabled ? "grant" : "revoke"}`);
    this.persistCognitive(next);
  }

  handleMemoryCreate(input: {
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
  }) {
    this.persistCognitive(createMemory(this.cognitive, input));
  }

  handleRunAgents() {
    this.persistCognitive(runAgents(this.cognitive));
  }

  handleActionCard(cardId: string, mode: "accepted" | "scheduled" | "dismissed") {
    this.persistCognitive(updateAction(this.cognitive, cardId, mode, mode === "scheduled" ? Date.now() + 60 * 60 * 1000 : null));
  }

  handleActionReflect(cardId: string, done: boolean, usefulness: number, obstacle: string) {
    this.persistCognitive(reflectAction(this.cognitive, cardId, { ts: Date.now(), done, usefulness, obstacle }));
  }

  createSuggestionFromChat(seed: string) {
    this.persistCognitive(createActionCard(this.cognitive, seed));
  }

  setVoice(next: Partial<VoicePrefs>) {
    this.persistCognitive({ ...this.cognitive, voice: { ...this.cognitive.voice, ...next } });
  }

  async speak(text: string) {
    if (!permissionEnabled(this.cognitive, "tts")) return;
    const provider = await synthesizeSpeech({
      text,
      provider: this.cognitive.voice.provider,
      browserVoiceUri: this.cognitive.voice.voiceURI,
      rate: this.cognitive.voice.rate,
      pitch: this.cognitive.voice.pitch,
      nvidiaVoice: this.cognitive.voice.nvidiaVoice,
    });
    if (!provider) return;
    this.persistCognitive(
      appendAudit(this.cognitive, "tts.used", `${provider}:assistant-response`),
    );
  }

  stopSpeech() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
  }

  startStt() {
    if (!permissionEnabled(this.cognitive, "mic") || !this.voiceSupported) return;
    const Ctor = (window as Window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: any }).webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    this.speechRec = rec as { stop: () => void };
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    this.voiceListening = true;
    rec.onresult = (event: any) => {
      const parts: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        parts.push(event.results[i][0].transcript);
      }
      const transcript = parts.join(" ").trim();
      this.voiceInterim = transcript;
      this.chatMessage = transcript;
    };
    rec.onerror = () => {
      this.voiceListening = false;
    };
    rec.onend = () => {
      this.voiceListening = false;
      this.speechRec = null;
      if (this.voiceInterim.trim()) {
        this.persistCognitive(appendAudit(this.cognitive, "stt.used", "chat-compose"));
      }
    };
    rec.start();
  }

  stopStt() {
    this.speechRec?.stop();
    this.speechRec = null;
    this.voiceListening = false;
  }

  setWellbeing(key: "cognitiveLoad" | "wellbeing", value: number) {
    this.persistCognitive({ ...this.cognitive, wellbeing: { ...this.cognitive.wellbeing, [key]: value } });
  }

  render() {
    return renderApp(this);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function extractMessageText(message: unknown): string | null {
  const row = message as Record<string, unknown> | null;
  if (!row) return null;
  const content = row.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts = content
      .map((item) => {
        const chunk = item as Record<string, unknown>;
        return chunk.type === "text" && typeof chunk.text === "string" ? chunk.text : null;
      })
      .filter((value): value is string => typeof value === "string");
    if (parts.length) return parts.join("\n");
  }
  return typeof row.text === "string" ? row.text : null;
}
