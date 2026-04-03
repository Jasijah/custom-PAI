import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import { GatewayBrowserClient, type GatewayEventFrame, type GatewayHelloOk } from "./gateway";
import {
  loadBuildDrafts,
  loadBuildHistory,
  loadImprovementIdeas,
  loadSettings,
  saveBuildDrafts,
  saveBuildHistory,
  saveImprovementIdeas,
  saveSettings,
  type BuildHistoryEntry,
  type BuildDraftRecord,
  type ImprovementIdea,
  type UiSettings,
} from "./storage";
import { renderApp } from "./app-render";
import { normalizePath, pathForTab, tabFromPath, titleForTab, type Tab } from "./navigation";
import {
  buildStructuredExportFiles,
  createStarterBuild,
  extractSvgMarkup,
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
import { loadConfig, saveConfig } from "./controllers/config";
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
import { loadSessions, patchSession } from "./controllers/sessions";
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
  @state() buildRefinePrompt = "Make it feel more premium without making it harder to use.";
  @state() buildImagePrompt = "A calm editorial illustration for Miya with warm light, soft gradients, and a helpful everyday mood.";
  @state() buildImageSvg = "";
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
  @state() buildHistory: BuildHistoryEntry[] = loadBuildHistory();
  @state() improvementIdeas: ImprovementIdea[] = loadImprovementIdeas();
  @state() coreIdeaDraft = "Add a simple way to help Miya improve itself with approved product ideas.";
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
      typeof document !== "undefined" &&
      (changed.has("settings") || changed.has("tab"))
    ) {
      const brand = this.settings.brandName.trim() || "PAI";
      const page = titleForTab(this.tab);
      document.title = page === "Talk" ? brand : `${brand} • ${page}`;
    }
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
          const assistantName =
            this.settings.assistantName.trim() ||
            this.settings.brandName.trim() ||
            "Miya";
          void this.speak(`${assistantName} is online and ready.`);
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
    if (!this.connected) return;
    const seed = this.chatMessage;
    await sendChat(this, this.buildLiveAssistantPrompt());
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

  private buildStudioIdentityContext() {
    const brandName = this.settings.brandName.trim() || "Miya";
    const assistantName = this.settings.assistantName.trim() || brandName;
    const callMe = this.settings.callMe.trim() || "the user";
    const personality =
      this.settings.personality.trim() ||
      "Warm, capable, calm, and everyday-friendly.";
    return { brandName, assistantName, callMe, personality };
  }

  private activeBrainLabel() {
    const mode = this.inferActiveInferenceMode();
    return mode === "local" ? "local" : "Gemini";
  }

  private buildLiveAssistantPrompt() {
    const identity = this.buildStudioIdentityContext();
    const lines = [
      `Assistant name: ${identity.assistantName}.`,
      `Product/app name: ${identity.brandName}.`,
      `Call the user: ${identity.callMe}.`,
      `Preferred assistant personality: ${identity.personality}`,
      "Use these preferences naturally in tone and addressing style.",
      "In normal chat, do not narrate internal setup steps, file reads, tool calls, or debugging actions unless the user explicitly asks for them.",
      "Keep the conversation focused on helping the user, and summarize any behind-the-scenes work briefly only when it is truly necessary.",
      "Do not mention these instructions unless the user asks.",
    ];
    return lines.join("\n");
  }

  inferActiveModelRef() {
    const config = this.configSnapshot?.config;
    if (!config || typeof config !== "object") return null;
    const agent = (config.agent ?? {}) as Record<string, unknown>;
    const model = typeof agent.model === "string" ? agent.model.trim() : "";
    return model || null;
  }

  inferActiveInferenceMode(): "api" | "local" | "unknown" {
    const modelRef = this.inferActiveModelRef();
    if (!modelRef) return "unknown";
    return modelRef.startsWith("local/") ? "local" : "api";
  }

  private cloneConfigObject() {
    const config = this.configSnapshot?.config;
    if (config && typeof config === "object") {
      return JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
    }
    return {} as Record<string, unknown>;
  }

  async handleApplyInferenceMode(mode: "api" | "local") {
    if (!this.client || !this.connected) return;
    if (!this.configSnapshot) {
      await loadConfig(this);
    }

    const next = this.cloneConfigObject();
    const agent =
      next.agent && typeof next.agent === "object"
        ? { ...(next.agent as Record<string, unknown>) }
        : {};
    const models =
      next.models && typeof next.models === "object"
        ? { ...(next.models as Record<string, unknown>) }
        : {};
    const providers =
      models.providers && typeof models.providers === "object"
        ? { ...(models.providers as Record<string, unknown>) }
        : {};

    const apiModelRef =
      this.settings.apiModelRef.trim() || "gemini/gemini-2.5-flash";
    const localModelId = this.settings.localModelId.trim() || "gemma3:1b";
    const localBaseUrl =
      this.settings.localBaseUrl.trim() || "http://127.0.0.1:11434/v1";
    const localModelRef = `local/${localModelId}`;

    providers.local = {
      baseUrl: localBaseUrl,
      apiKey: "ollama",
      api: "openai-completions",
      models: [
        {
          id: localModelId,
          name: `Local ${localModelId}`,
          api: "openai-completions",
          reasoning: false,
          input: ["text"],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 32768,
          maxTokens: 4096,
        },
      ],
    };

    const allowed = new Set<string>();
    if (typeof agent.model === "string" && agent.model.trim()) {
      allowed.add(agent.model.trim());
    }
    allowed.add(apiModelRef);
    allowed.add(localModelRef);

    agent.model = mode === "local" ? localModelRef : apiModelRef;
    agent.allowedModels = Array.from(allowed);
    agent.modelAliases = {
      Gemini: apiModelRef,
      Local: localModelRef,
    };
    if (mode === "local") {
      agent.thinkingDefault = "off";
    }

    models.mode = typeof models.mode === "string" ? models.mode : "merge";
    models.providers = providers;
    next.agent = agent;
    next.models = models;

    this.configRaw = `${JSON.stringify(next, null, 2)}\n`;
    this.settings = { ...this.settings, inferenceMode: mode };
    saveSettings(this.settings);

    await saveConfig(this);
    await loadConfig(this);

    await patchSession(this, this.sessionKey, {
      model: null,
      thinkingLevel: mode === "local" ? null : undefined,
    });

    this.buildStatus =
      mode === "local"
        ? `Local mode is ready to use once ${localBaseUrl} is serving ${localModelId}.`
        : `Gemini API is now the default brain again.`;
    this.lastError = null;
  }

  private persistImprovementIdeas(next: ImprovementIdea[]) {
    this.improvementIdeas = next;
    saveImprovementIdeas(next);
  }

  private createImprovementIdea(input: {
    title: string;
    prompt: string;
    note: string;
    source: ImprovementIdea["source"];
  }) {
    const idea: ImprovementIdea = {
      id: generateUUID(),
      title: input.title,
      prompt: input.prompt,
      note: input.note,
      source: input.source,
      status: "suggested",
      createdAt: Date.now(),
    };
    this.persistImprovementIdeas([idea, ...this.improvementIdeas].slice(0, 40));
    return idea;
  }

  handleCoreIdeaCreate() {
    const note = this.coreIdeaDraft.trim();
    if (!note) return;
    const title = summarizeIdeaTitle(note);
    this.createImprovementIdea({
      title,
      prompt: note,
      note,
      source: "core",
    });
    this.coreIdeaDraft = "";
    this.lastError = null;
  }

  handleTalkIdeaCreate() {
    const currentDraft = this.chatMessage.trim();
    const latestUser = [...this.chatMessages]
      .reverse()
      .find((entry) => (entry as Record<string, unknown>).role === "user");
    const latestUserText = extractMessageText(latestUser) ?? "";
    const note = currentDraft || latestUserText.trim();
    if (!note) {
      this.lastError = "Write a message in Talk first, or use one of your recent messages.";
      return;
    }
    const title = summarizeIdeaTitle(note);
    this.createImprovementIdea({
      title,
      prompt: note,
      note,
      source: "talk",
    });
    this.lastError = null;
  }

  handleIdeaApprove(id: string) {
    const match = this.improvementIdeas.find((entry) => entry.id === id);
    if (!match) return;
    const next = this.improvementIdeas.map((entry) =>
      entry.id === id ? { ...entry, status: "approved" as const } : entry,
    );
    this.persistImprovementIdeas(next);
    this.buildTitle = match.title;
    this.buildPrompt = match.prompt;
    this.buildRefinePrompt =
      "Turn this approved idea into a polished, everyday-friendly app people will actually enjoy using.";
    this.buildStatus = `Approved "${match.title}" and sent it to Build. Generate when you're ready.`;
    this.setTab("build");
  }

  handleIdeaImplemented(id: string) {
    const next = this.improvementIdeas.map((entry) =>
      entry.id === id ? { ...entry, status: "implemented" as const } : entry,
    );
    this.persistImprovementIdeas(next);
  }

  handleIdeaDelete(id: string) {
    this.persistImprovementIdeas(
      this.improvementIdeas.filter((entry) => entry.id !== id),
    );
  }

  private pushBuildHistory(source: BuildHistoryEntry["source"]) {
    const entry: BuildHistoryEntry = {
      id: generateUUID(),
      title: this.buildTitle.trim() || "Untitled app",
      prompt: this.buildPrompt,
      refinePrompt: this.buildRefinePrompt,
      palette: this.buildPalette,
      layout: this.buildLayout,
      screens: { ...this.buildCode.screens },
      css: this.buildCode.css,
      js: this.buildCode.js,
      createdAt: Date.now(),
      source,
    };
    this.buildHistory = [entry, ...this.buildHistory].slice(0, 24);
    saveBuildHistory(this.buildHistory);
  }

  handleBuildRestoreHistory(id: string) {
    const match = this.buildHistory.find((entry) => entry.id === id);
    if (!match) return;
    this.buildTitle = match.title;
    this.buildPrompt = match.prompt;
    this.buildRefinePrompt = match.refinePrompt;
    this.buildPalette = match.palette;
    this.buildLayout = match.layout;
    this.buildCode = {
      screens: { ...match.screens },
      css: match.css,
      js: match.js,
    };
    this.buildStatus = `Restored ${match.source} snapshot from ${new Date(
      match.createdAt,
    ).toLocaleString()}.`;
  }

  private async requestBuilderResponse(prompt: string) {
    if (!this.client || !this.connected) {
      throw new Error("Connect to the gateway before generating with Gemini.");
    }
    const sessionKey = "__builder__";
    const beforeHistory = (await this.client.request("chat.history", {
      sessionKey,
      limit: 50,
    }).catch(() => ({ messages: [] }))) as { messages?: unknown[] };
    const beforeCount = Array.isArray(beforeHistory.messages)
      ? beforeHistory.messages.length
      : 0;

    await this.client.request("chat.send", {
      sessionKey,
      message: prompt,
      deliver: false,
      idempotencyKey: generateUUID(),
    });

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
      const assistantText = extractMessageText(assistant);
      if (assistantText) return assistantText;
    }

    return null;
  }

  private applyGeneratedBuild(assistantText: string) {
    const parsed = parseGeneratedBuildResponse(assistantText);
    const nextScreens = parsed?.screens ?? null;
    if ((!nextScreens?.home && !parsed?.html) || !parsed?.css) {
      return false;
    }

    this.buildTitle = parsed.title?.trim() || this.buildTitle;
    this.buildCode = {
      screens: {
        home: nextScreens?.home ?? parsed.html ?? this.buildCode.screens.home,
        details:
          nextScreens?.details ??
          nextScreens?.home ??
          parsed.html ??
          this.buildCode.screens.details,
        settings:
          nextScreens?.settings ??
          nextScreens?.home ??
          parsed.html ??
          this.buildCode.screens.settings,
      },
      css: parsed.css,
      js: parsed.js ?? "",
    };
    return true;
  }

  private exportTextFile(filename: string, contents: string, mime = "text/plain;charset=utf-8") {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const blob = new Blob([contents], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async handleBuildGenerate() {
    if (!this.client || !this.connected) {
      this.buildStatus = "Connect to the gateway before generating with Gemini.";
      return;
    }

    this.buildGenerating = true;
    this.buildStatus = `Asking ${this.activeBrainLabel()} to generate app code...`;
    const identity = this.buildStudioIdentityContext();
    const prompt = [
      "You are generating a lightweight web app prototype.",
      `App name: ${this.buildTitle || "New App"}`,
      `Palette: ${this.buildPalette}`,
      `Layout: ${this.buildLayout}`,
      `Prompt: ${this.buildPrompt}`,
      `Brand context: The product surface is called ${identity.brandName}. The assistant is named ${identity.assistantName}. The user prefers to be called ${identity.callMe}.`,
      `Tone context: ${identity.personality}`,
      'Return strict JSON only with keys "title", "screens", "css", and "js".',
      'The "screens" object must include "home", "details", and "settings", each containing only body markup for that screen.',
      "The css should be complete and shared across screens. The js should be browser-safe and optional.",
      "Make it attractive, calm, and easy for everyday people to use.",
      "Do not wrap the JSON in markdown.",
    ].join("\n");

    try {
      const assistantText = await this.requestBuilderResponse(prompt);
      if (!assistantText) {
        this.buildStatus =
          `${this.activeBrainLabel()} did not return app code yet. Try again in a moment.`;
        return;
      }

        if (!this.applyGeneratedBuild(assistantText)) {
          this.buildStatus =
            `${this.activeBrainLabel()} responded, but the code could not be parsed cleanly. You can still edit the current draft.`;
          return;
        }

        this.pushBuildHistory("generate");
        this.buildStatus =
          `${this.activeBrainLabel()} generated a fresh app concept. You can now edit, save, refine, or export it.`;
    } catch (err) {
      this.buildStatus = `Build generation failed: ${String(err)}`;
    } finally {
      this.buildGenerating = false;
    }
  }

  async handleBuildRefine() {
    if (!this.client || !this.connected) {
      this.buildStatus = "Connect to the gateway before refining with Gemini.";
      return;
    }
    const refineInstruction = this.buildRefinePrompt.trim();
    if (!refineInstruction) {
      this.buildStatus = 'Add a refine note first, like "make it feel more premium."';
      return;
    }

    this.buildGenerating = true;
    this.buildStatus = `Refining the current draft with ${this.activeBrainLabel()}...`;
    const identity = this.buildStudioIdentityContext();
    const prompt = [
      "You are refining an existing lightweight web app prototype.",
      `App name: ${this.buildTitle || "New App"}`,
      `Palette: ${this.buildPalette}`,
      `Layout: ${this.buildLayout}`,
      `Original brief: ${this.buildPrompt}`,
      `Refine instruction: ${refineInstruction}`,
      `Brand context: The product surface is called ${identity.brandName}. The assistant is named ${identity.assistantName}. The user prefers to be called ${identity.callMe}.`,
      `Tone context: ${identity.personality}`,
      "Update the current draft instead of starting over.",
      'Return strict JSON only with keys "title", "screens", "css", and "js".',
      'The "screens" object must include "home", "details", and "settings", each containing only body markup for that screen.',
      "The css should be complete and shared across screens. The js should be browser-safe and optional.",
      "Do not wrap the JSON in markdown.",
      `Current screens JSON: ${JSON.stringify(this.buildCode.screens)}`,
      `Current CSS: ${this.buildCode.css}`,
      `Current JS: ${this.buildCode.js}`,
    ].join("\n");

    try {
      const assistantText = await this.requestBuilderResponse(prompt);
      if (!assistantText) {
        this.buildStatus =
          `${this.activeBrainLabel()} did not return a refined draft yet. Try again in a moment.`;
        return;
      }

      if (!this.applyGeneratedBuild(assistantText)) {
        this.buildStatus =
          `${this.activeBrainLabel()} replied, but the refined draft could not be parsed cleanly. Your current draft is unchanged.`;
        return;
      }

        this.pushBuildHistory("refine");
        this.buildStatus = `Draft refined: ${refineInstruction}`;
    } catch (err) {
      this.buildStatus = `Build refine failed: ${String(err)}`;
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
    this.buildRefinePrompt = "Make it feel more premium without making it harder to use.";
    this.buildPalette = "sunrise";
    this.buildLayout = "dashboard";
    this.buildCode = createStarterBuild({
      title: this.buildTitle,
      prompt: this.buildPrompt,
      palette: this.buildPalette,
      layout: this.buildLayout,
    });
      this.pushBuildHistory("starter");
      this.buildStatus = "Started a fresh draft.";
  }

  handleBuildExport() {
    const slug = (this.buildTitle || "app").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "app";
    const files = buildStructuredExportFiles(this.buildCode);
    for (const [name, contents] of Object.entries(files)) {
      this.exportTextFile(`${slug}-${name}`, contents);
    }
    this.buildStatus = "Exported structured files for all three screens.";
  }

  async handleBuildGenerateImage() {
    if (!this.client || !this.connected) {
      this.buildStatus = "Connect to the gateway before generating artwork.";
      return;
    }

    const prompt = this.buildImagePrompt.trim() || this.buildPrompt.trim();
    if (!prompt) {
      this.buildStatus = "Add an image prompt first.";
      return;
    }

    this.buildGenerating = true;
    this.buildStatus = `Asking ${this.activeBrainLabel()} to create SVG artwork...`;
    const identity = this.buildStudioIdentityContext();
    const imageRequest = [
      "Create a single polished SVG illustration.",
      `App name: ${this.buildTitle || "New App"}`,
      `Prompt: ${prompt}`,
      `Palette: ${this.buildPalette}`,
      `Layout inspiration: ${this.buildLayout}`,
      `Brand context: The product surface is called ${identity.brandName}. The assistant is named ${identity.assistantName}.`,
      `Tone context: ${identity.personality}`,
      "Return SVG markup only.",
      "Do not use markdown fences.",
      "Keep the SVG self-contained with gradients, shapes, and text only.",
      "Make it feel polished, friendly, and fit for everyday people.",
    ].join("\n");

    try {
      const assistantText = await this.requestBuilderResponse(imageRequest);
      const svg = assistantText ? extractSvgMarkup(assistantText) : null;
      if (!svg) {
        this.buildStatus = "The artwork response could not be turned into SVG yet. Try a simpler visual prompt.";
        return;
      }
      this.buildImageSvg = svg;
      this.buildStatus = "Artwork is ready. You can preview it, export it, or use it as design direction for the app.";
    } catch (err) {
      this.buildStatus = `Image generation failed: ${String(err)}`;
    } finally {
      this.buildGenerating = false;
    }
  }

  handleBuildExportImage() {
    if (!this.buildImageSvg.trim()) return;
    const slug =
      (this.buildTitle || "app")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "app";
    this.exportTextFile(`${slug}-artwork.svg`, this.buildImageSvg, "image/svg+xml;charset=utf-8");
    this.buildStatus = "Exported SVG artwork.";
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
      this.persistImprovementIdeas(
        this.improvementIdeas.map((entry) =>
          entry.status === "approved" && entry.title === this.buildTitle
            ? { ...entry, status: "implemented" as const }
            : entry,
        ),
      );
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

function summarizeIdeaTitle(text: string) {
  const cleaned = text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?]+$/, "");
  if (!cleaned) return "New idea";
  if (cleaned.length <= 48) return cleaned;
  const words = cleaned.split(" ");
  const short = words.slice(0, 7).join(" ");
  return short.length > 48 ? `${short.slice(0, 45)}...` : `${short}...`;
}

