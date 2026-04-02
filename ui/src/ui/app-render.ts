import { html, nothing } from "lit";

import type { GatewayBrowserClient, GatewayHelloOk } from "./gateway";
import {
  TAB_GROUPS,
  pathForTab,
  subtitleForTab,
  titleForTab,
  type Tab,
} from "./navigation";
import type {
  BuildDraftRecord,
  BuildHistoryEntry,
  ImprovementIdea,
  UiSettings,
} from "./storage";
import type { ThemeMode } from "./theme";
import type { ThemeTransitionContext } from "./theme-transition";
import type {
  CognitiveState,
  GrantDuration,
  MemoryLayer,
  PermissionScope,
  PrivacyLevel,
  VoicePrefs,
} from "./cognitive-store";
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
import type {
  CronFormState,
  DiscordForm,
  IMessageForm,
  SignalForm,
  TelegramForm,
} from "./ui-types";
import { renderChat } from "./views/chat";
import { renderCore } from "./views/core";
import { renderBuild } from "./views/build";
import { renderDashboard } from "./views/dashboard";
import { renderConnections } from "./views/connections";
import { renderCron } from "./views/cron";
import { renderDebug } from "./views/debug";
import { renderInstances } from "./views/instances";
import { renderNodes } from "./views/nodes";
import { renderMemory } from "./views/memory";
import { renderAgents } from "./views/agents";
import { renderTrust } from "./views/trust";
import { renderOverview } from "./views/overview";
import { renderSessions } from "./views/sessions";
import { renderSkills } from "./views/skills";
import {
  loadProviders,
  updateDiscordForm,
  updateIMessageForm,
  updateSignalForm,
  updateTelegramForm,
} from "./controllers/connections";
import { loadPresence } from "./controllers/presence";
import { loadSessions, patchSession } from "./controllers/sessions";
import {
  installSkill,
  loadSkills,
  saveSkillApiKey,
  updateSkillEdit,
  updateSkillEnabled,
} from "./controllers/skills";
import { loadNodes } from "./controllers/nodes";
import { loadChatHistory } from "./controllers/chat";
import { loadConfig, saveConfig } from "./controllers/config";
import { loadCronRuns, toggleCronJob, runCronJob, removeCronJob, addCronJob } from "./controllers/cron";
import { loadDebug, callDebugMethod } from "./controllers/debug";

export type EventLogEntry = {
  ts: number;
  event: string;
  payload?: unknown;
};

export type AppViewState = {
  settings: UiSettings;
  password: string;
  tab: Tab;
  basePath: string;
  connected: boolean;
  theme: ThemeMode;
  themeResolved: "light" | "dark";
  hello: GatewayHelloOk | null;
  lastError: string | null;
  eventLog: EventLogEntry[];
  paletteOpen: boolean;
  paletteQuery: string;
  sessionKey: string;
  chatLoading: boolean;
  chatSending: boolean;
  chatMessage: string;
  chatMessages: unknown[];
  chatStream: string | null;
  chatRunId: string | null;
  chatThinkingLevel: string | null;
  buildPrompt: string;
  buildRefinePrompt: string;
  buildTitle: string;
  buildPalette: "sunrise" | "ocean" | "forest" | "graphite";
  buildLayout: "dashboard" | "mobile" | "studio";
  buildCode: {
    screens: { home: string; details: string; settings: string };
    css: string;
    js: string;
  };
  buildActiveScreen: "home" | "details" | "settings";
  buildDrafts: BuildDraftRecord[];
  buildHistory: BuildHistoryEntry[];
  improvementIdeas: ImprovementIdea[];
  coreIdeaDraft: string;
  buildSelectedDraftId: string | null;
  buildGenerating: boolean;
  buildStatus: string | null;
  cognitive: CognitiveState;
  memoryQuery: string;
  voiceListening: boolean;
  voiceSupported: boolean;
  nodesLoading: boolean;
  nodes: Array<Record<string, unknown>>;
  configLoading: boolean;
  configRaw: string;
  configValid: boolean | null;
  configIssues: unknown[];
  configSaving: boolean;
  configSnapshot: ConfigSnapshot | null;
  providersLoading: boolean;
  providersSnapshot: ProvidersStatusSnapshot | null;
  providersError: string | null;
  providersLastSuccess: number | null;
  whatsappLoginMessage: string | null;
  whatsappLoginQrDataUrl: string | null;
  whatsappLoginConnected: boolean | null;
  whatsappBusy: boolean;
  telegramForm: TelegramForm;
  telegramSaving: boolean;
  telegramTokenLocked: boolean;
  telegramConfigStatus: string | null;
  discordForm: DiscordForm;
  discordSaving: boolean;
  discordTokenLocked: boolean;
  discordConfigStatus: string | null;
  signalForm: SignalForm;
  signalSaving: boolean;
  signalConfigStatus: string | null;
  imessageForm: IMessageForm;
  imessageSaving: boolean;
  imessageConfigStatus: string | null;
  presenceLoading: boolean;
  presenceEntries: PresenceEntry[];
  presenceError: string | null;
  presenceStatus: string | null;
  sessionsLoading: boolean;
  sessionsResult: SessionsListResult | null;
  sessionsError: string | null;
  sessionsFilterActive: string;
  sessionsFilterLimit: string;
  sessionsIncludeGlobal: boolean;
  sessionsIncludeUnknown: boolean;
  cronLoading: boolean;
  cronJobs: CronJob[];
  cronStatus: CronStatus | null;
  cronError: string | null;
  cronForm: CronFormState;
  cronRunsJobId: string | null;
  cronRuns: CronRunLogEntry[];
  cronBusy: boolean;
  skillsLoading: boolean;
  skillsReport: SkillStatusReport | null;
  skillsError: string | null;
  skillsFilter: string;
  skillEdits: Record<string, string>;
  skillsBusyKey: string | null;
  debugLoading: boolean;
  debugStatus: StatusSummary | null;
  debugHealth: HealthSnapshot | null;
  debugModels: unknown[];
  debugHeartbeat: unknown | null;
  debugCallMethod: string;
  debugCallParams: string;
  debugCallResult: string | null;
  debugCallError: string | null;
  client: GatewayBrowserClient | null;
  connect: () => void;
  setTab: (tab: Tab) => void;
  openPalette: () => void;
  closePalette: () => void;
  setTheme: (theme: ThemeMode, context?: ThemeTransitionContext) => void;
  applySettings: (next: UiSettings) => void;
  loadOverview: () => Promise<void>;
  loadCron: () => Promise<void>;
  handleWhatsAppStart: (force: boolean) => Promise<void>;
  handleWhatsAppWait: () => Promise<void>;
  handleWhatsAppLogout: () => Promise<void>;
  handleTelegramSave: () => Promise<void>;
  handleDiscordSave: () => Promise<void>;
  handleSignalSave: () => Promise<void>;
  handleIMessageSave: () => Promise<void>;
  handleSendChat: () => Promise<void>;
  handleBuildGenerate: () => Promise<void>;
  handleBuildRefine: () => Promise<void>;
  handleBuildSaveDraft: () => void;
  handleBuildExport: () => void;
  handleBuildScaffold: () => Promise<void>;
  handleBuildSelectDraft: (id: string) => void;
  handleBuildRestoreHistory: (id: string) => void;
  handleBuildNewDraft: () => void;
  handleBuildDeleteDraft: (id: string) => void;
  handleCoreIdeaCreate: () => void;
  handleTalkIdeaCreate: () => void;
  handleIdeaApprove: (id: string) => void;
  handleIdeaImplemented: (id: string) => void;
  handleIdeaDelete: (id: string) => void;
  inferActiveInferenceMode: () => "api" | "local" | "unknown";
  inferActiveModelRef: () => string | null;
  handleApplyInferenceMode: (mode: "api" | "local") => Promise<void>;
  handlePermission: (scope: PermissionScope, enabled: boolean, duration: GrantDuration) => void;
  handleMemoryCreate: (input: {
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
  handleRunAgents: () => void;
  handleActionCard: (id: string, mode: "accepted" | "scheduled" | "dismissed") => void;
  handleActionReflect: (id: string, done: boolean, usefulness: number, obstacle: string) => void;
  memoryResults: () => ReturnType<typeof import("./cognitive-store").searchMemory>;
  setVoice: (next: Partial<VoicePrefs>) => void;
  startStt: () => void;
  stopStt: () => void;
  stopSpeech: () => void;
  speak: (text: string) => void;
  setWellbeing: (key: "cognitiveLoad" | "wellbeing", value: number) => void;
};

export function renderApp(state: AppViewState) {
  const presenceCount = state.presenceEntries.length;
  const sessionsCount = state.sessionsResult?.count ?? null;
  const cronNext = state.cronStatus?.nextWakeAtMs ?? null;
  const chatDisabledReason = !state.connected
    ? "Disconnected from gateway."
    : null;

  const linkedProviders = countLinkedProviders(state.providersSnapshot);
  const timeline = state.eventLog.slice(0, 8);
  const paletteResults = resolvePaletteResults(state.paletteQuery);

  return html`
    <div class="shell">
        <header class="topbar">
          <div class="brand brand-rich">
            <div class="brand-kicker">Everyday assistant</div>
            <div class="brand-title">${state.settings.brandName || state.settings.assistantName || "Miya"}</div>
            <div class="brand-sub">One place for conversations, connected apps, and your daily rhythm.</div>
          </div>
        <div class="topbar-status">
          <button class="quick-search" @click=${() => state.openPalette()} aria-label="Open command palette">
            <span>Search or jump</span>
            <span class="quick-search__hint">Ctrl K</span>
          </button>
          <div class="pill">
            <span class="statusDot ${state.connected ? "ok" : ""}"></span>
            <span>${state.connected ? "Ready" : "Offline"}</span>
            <span class="mono">${state.connected ? "OK" : "Offline"}</span>
          </div>
          <div class="pill subtle">
            <span>Linked apps</span>
            <span class="mono">${linkedProviders}</span>
          </div>
          ${renderThemeToggle(state)}
        </div>
      </header>
      <aside class="nav">
        ${TAB_GROUPS.map(
          (group) => html`
            <div class="nav-group">
              <div class="nav-label">${group.label}</div>
              ${group.tabs.map((tab) => renderTab(state, tab))}
            </div>
          `,
        )}
      </aside>
      <main class="content">
        <section class="content-header">
          <div>
            <div class="page-kicker">${pageKickerForTab(state.tab)}</div>
            <div class="page-title">${titleForTab(state.tab)}</div>
            <div class="page-sub">${subtitleForTab(state.tab)}</div>
          </div>
          <div class="page-meta">
            ${state.lastError
              ? html`<div class="pill danger">${state.lastError}</div>`
              : nothing}
          </div>
        </section>

        ${state.tab === "overview"
          ? renderOverview({
              connected: state.connected,
              hello: state.hello,
              settings: state.settings,
              password: state.password,
              lastError: state.lastError,
              presenceCount,
              sessionsCount,
              cronEnabled: state.cronStatus?.enabled ?? null,
              cronNext,
              nodes: state.nodes,
              providersSnapshot: state.providersSnapshot,
              eventLog: timeline,
              lastProvidersRefresh: state.providersLastSuccess,
              onSettingsChange: (next) => state.applySettings(next),
              onPasswordChange: (next) => (state.password = next),
              onSessionKeyChange: (next) => {
                state.sessionKey = next;
                state.chatMessage = "";
                state.applySettings({ ...state.settings, sessionKey: next });
              },
              onRefresh: () => state.loadOverview(),
            })
          : nothing}

        ${state.tab === "connections"
          ? renderConnections({
              connected: state.connected,
              loading: state.providersLoading,
              snapshot: state.providersSnapshot,
              lastError: state.providersError,
              lastSuccessAt: state.providersLastSuccess,
              whatsappMessage: state.whatsappLoginMessage,
              whatsappQrDataUrl: state.whatsappLoginQrDataUrl,
              whatsappConnected: state.whatsappLoginConnected,
              whatsappBusy: state.whatsappBusy,
              telegramForm: state.telegramForm,
              telegramTokenLocked: state.telegramTokenLocked,
              telegramSaving: state.telegramSaving,
              telegramStatus: state.telegramConfigStatus,
              discordForm: state.discordForm,
              discordTokenLocked: state.discordTokenLocked,
              discordSaving: state.discordSaving,
              discordStatus: state.discordConfigStatus,
              signalForm: state.signalForm,
              signalSaving: state.signalSaving,
              signalStatus: state.signalConfigStatus,
              imessageForm: state.imessageForm,
              imessageSaving: state.imessageSaving,
              imessageStatus: state.imessageConfigStatus,
              onRefresh: (probe) => loadProviders(state, probe),
              onWhatsAppStart: (force) => state.handleWhatsAppStart(force),
              onWhatsAppWait: () => state.handleWhatsAppWait(),
              onWhatsAppLogout: () => state.handleWhatsAppLogout(),
              onTelegramChange: (patch) => updateTelegramForm(state, patch),
              onTelegramSave: () => state.handleTelegramSave(),
              onDiscordChange: (patch) => updateDiscordForm(state, patch),
              onDiscordSave: () => state.handleDiscordSave(),
              onSignalChange: (patch) => updateSignalForm(state, patch),
              onSignalSave: () => state.handleSignalSave(),
              onIMessageChange: (patch) => updateIMessageForm(state, patch),
              onIMessageSave: () => state.handleIMessageSave(),
            })
          : nothing}

        ${state.tab === "instances"
          ? renderInstances({
              loading: state.presenceLoading,
              entries: state.presenceEntries,
              lastError: state.presenceError,
              statusMessage: state.presenceStatus,
              onRefresh: () => loadPresence(state),
            })
          : nothing}

        ${state.tab === "sessions"
          ? renderSessions({
              loading: state.sessionsLoading,
              result: state.sessionsResult,
              error: state.sessionsError,
              activeMinutes: state.sessionsFilterActive,
              limit: state.sessionsFilterLimit,
              includeGlobal: state.sessionsIncludeGlobal,
              includeUnknown: state.sessionsIncludeUnknown,
              onFiltersChange: (next) => {
                state.sessionsFilterActive = next.activeMinutes;
                state.sessionsFilterLimit = next.limit;
                state.sessionsIncludeGlobal = next.includeGlobal;
                state.sessionsIncludeUnknown = next.includeUnknown;
              },
              onRefresh: () => loadSessions(state),
              onPatch: (key, patch) => patchSession(state, key, patch),
            })
          : nothing}

        ${state.tab === "cron"
          ? renderCron({
              loading: state.cronLoading,
              status: state.cronStatus,
              jobs: state.cronJobs,
              error: state.cronError,
              busy: state.cronBusy,
              form: state.cronForm,
              runsJobId: state.cronRunsJobId,
              runs: state.cronRuns,
              onFormChange: (patch) => (state.cronForm = { ...state.cronForm, ...patch }),
              onRefresh: () => state.loadCron(),
              onAdd: () => addCronJob(state),
              onToggle: (job, enabled) => toggleCronJob(state, job, enabled),
              onRun: (job) => runCronJob(state, job),
              onRemove: (job) => removeCronJob(state, job),
              onLoadRuns: (jobId) => loadCronRuns(state, jobId),
            })
          : nothing}

        ${state.tab === "skills"
          ? renderSkills({
              loading: state.skillsLoading,
              report: state.skillsReport,
              error: state.skillsError,
              filter: state.skillsFilter,
              edits: state.skillEdits,
              busyKey: state.skillsBusyKey,
              onFilterChange: (next) => (state.skillsFilter = next),
              onRefresh: () => loadSkills(state),
              onToggle: (key, enabled) => updateSkillEnabled(state, key, enabled),
              onEdit: (key, value) => updateSkillEdit(state, key, value),
              onSaveKey: (key) => saveSkillApiKey(state, key),
              onInstall: (name, installId) => installSkill(state, name, installId),
            })
          : nothing}

        ${state.tab === "nodes"
          ? renderNodes({
              loading: state.nodesLoading,
              nodes: state.nodes,
              onRefresh: () => loadNodes(state),
            })
          : nothing}

          ${state.tab === "chat"
            ? renderChat({
                assistantName: state.settings.assistantName || state.settings.brandName || "Miya",
                callMe: state.settings.callMe,
                sessionKey: state.sessionKey,
              onSessionKeyChange: (next) => {
                state.sessionKey = next;
                state.chatMessage = "";
                state.chatStream = null;
                state.chatRunId = null;
                state.applySettings({ ...state.settings, sessionKey: next });
                void loadChatHistory(state);
              },
              thinkingLevel: state.chatThinkingLevel,
              loading: state.chatLoading,
              sending: state.chatSending,
              messages: state.chatMessages,
              stream: state.chatStream,
              draft: state.chatMessage,
              connected: state.connected,
              canSend: state.connected,
              disabledReason: chatDisabledReason,
              sessions: state.sessionsResult,
              eventLog: timeline,
              providersSnapshot: state.providersSnapshot,
              onRefresh: () => loadChatHistory(state),
              onDraftChange: (next) => (state.chatMessage = next),
              onSend: () => state.handleSendChat(),
              onCreateIdea: () => state.handleTalkIdeaCreate(),
              actionCards: state.cognitive.actions.slice(0, 4),
              voice: state.cognitive.voice,
              voiceSupported: state.voiceSupported,
              voiceListening: state.voiceListening,
              onVoiceChange: (next) => state.setVoice(next),
              onVoiceStart: () => state.startStt(),
              onVoiceStop: () => state.stopStt(),
              onReadAloud: (text) => state.speak(text),
              onAction: (id, mode) => state.handleActionCard(id, mode),
              onReflect: (id, done, usefulness, obstacle) => state.handleActionReflect(id, done, usefulness, obstacle),
            })
          : nothing}

          ${state.tab === "build"
            ? renderBuild({
                brandName: state.settings.brandName || state.settings.assistantName || "Miya",
                assistantName: state.settings.assistantName || state.settings.brandName || "Miya",
                title: state.buildTitle,
                prompt: state.buildPrompt,
                refinePrompt: state.buildRefinePrompt,
                palette: state.buildPalette,
              layout: state.buildLayout,
                code: state.buildCode,
                activeScreen: state.buildActiveScreen,
                drafts: state.buildDrafts,
                history: state.buildHistory,
                selectedDraftId: state.buildSelectedDraftId,
              generating: state.buildGenerating,
                status: state.buildStatus,
                onTitleChange: (next) => (state.buildTitle = next),
                onPromptChange: (next) => (state.buildPrompt = next),
                onRefinePromptChange: (next) => (state.buildRefinePrompt = next),
                onPaletteChange: (next) => (state.buildPalette = next),
              onLayoutChange: (next) => (state.buildLayout = next),
              onScreenChange: (next) => (state.buildActiveScreen = next),
              onCodeChange: (kind, next, screen) => {
                if (kind === "screen" && screen) {
                  state.buildCode = {
                    ...state.buildCode,
                    screens: { ...state.buildCode.screens, [screen]: next },
                  };
                  return;
                }
                state.buildCode = { ...state.buildCode, [kind]: next };
                },
                onGenerate: () => state.handleBuildGenerate(),
                onRefine: () => state.handleBuildRefine(),
                onSaveDraft: () => state.handleBuildSaveDraft(),
              onExport: () => state.handleBuildExport(),
                onScaffold: () => state.handleBuildScaffold(),
                onSelectDraft: (id) => state.handleBuildSelectDraft(id),
                onRestoreHistory: (id) => state.handleBuildRestoreHistory(id),
                onNewDraft: () => state.handleBuildNewDraft(),
              onDeleteDraft: (id) => state.handleBuildDeleteDraft(id),
            })
          : nothing}


        ${state.tab === "memory"
          ? renderMemory({
              cognitive: state.cognitive,
              results: state.memoryResults(),
              query: state.memoryQuery,
              onQueryChange: (next) => (state.memoryQuery = next),
              onCreate: (input) => state.handleMemoryCreate(input),
            })
          : nothing}

        ${state.tab === "agents"
          ? renderAgents({
              cognitive: state.cognitive,
              onRunAgents: () => state.handleRunAgents(),
              onAction: (id, mode) => state.handleActionCard(id, mode),
              onReflect: (id, done, usefulness, obstacle) =>
                state.handleActionReflect(id, done, usefulness, obstacle),
            })
          : nothing}

        ${state.tab === "trust"
          ? renderTrust({
              cognitive: state.cognitive,
              onPermission: (scope, enabled, duration) =>
                state.handlePermission(scope, enabled, duration),
            })
          : nothing}

        ${state.tab === "dashboard" || state.tab === "economy"
          ? renderDashboard({
              cognitive: state.cognitive,
              onWellbeing: (key, value) => state.setWellbeing(key, value),
            })
          : nothing}

          ${state.tab === "config"
            ? renderCore({
                settings: state.settings,
                password: state.password,
                raw: state.configRaw,
                valid: state.configValid,
                issues: state.configIssues,
                loading: state.configLoading,
                saving: state.configSaving,
                connected: state.connected,
                activeInferenceMode: state.inferActiveInferenceMode(),
                activeModelRef: state.inferActiveModelRef(),
                improvementIdeas: state.improvementIdeas,
                ideaDraft: state.coreIdeaDraft,
                onSettingsChange: (next) => state.applySettings(next),
                onPasswordChange: (next) => (state.password = next),
                onIdeaDraftChange: (next) => (state.coreIdeaDraft = next),
                onIdeaCreate: () => state.handleCoreIdeaCreate(),
                onIdeaApprove: (id) => state.handleIdeaApprove(id),
                onIdeaImplemented: (id) => state.handleIdeaImplemented(id),
                onIdeaDelete: (id) => state.handleIdeaDelete(id),
                onApplyInferenceMode: (mode) => state.handleApplyInferenceMode(mode),
                onRawChange: (next) => (state.configRaw = next),
                onReload: () => loadConfig(state),
                onSave: () => saveConfig(state),
            })
          : nothing}

        ${state.tab === "debug"
          ? renderDebug({
              loading: state.debugLoading,
              status: state.debugStatus,
              health: state.debugHealth,
              models: state.debugModels,
              heartbeat: state.debugHeartbeat,
              eventLog: state.eventLog,
              callMethod: state.debugCallMethod,
              callParams: state.debugCallParams,
              callResult: state.debugCallResult,
              callError: state.debugCallError,
              onCallMethodChange: (next) => (state.debugCallMethod = next),
              onCallParamsChange: (next) => (state.debugCallParams = next),
              onRefresh: () => loadDebug(state),
              onCall: () => callDebugMethod(state),
            })
          : nothing}
      </main>
      <nav class="mobile-tabs" aria-label="Mobile navigation">
        ${["overview", "chat", "connections", "sessions", "dashboard"].map((tab) => renderTab(state, tab as Tab))}
      </nav>
      ${state.paletteOpen ? renderCommandPalette(state, paletteResults) : nothing}
    </div>
  `;
}

function renderTab(state: AppViewState, tab: Tab) {
  const href = pathForTab(tab, state.basePath);
  return html`
    <a
      href=${href}
      class="nav-item ${state.tab === tab ? "active" : ""}"
      @click=${(event: MouseEvent) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        state.setTab(tab);
      }}
    >
      <span>${titleForTab(tab)}</span>
    </a>
  `;
}

function countLinkedProviders(snapshot: ProvidersStatusSnapshot | null) {
  if (!snapshot) return 0;
  const flags = [
    snapshot.whatsapp.configured || snapshot.whatsapp.linked || snapshot.whatsapp.running,
    snapshot.telegram.configured || snapshot.telegram.running,
    Boolean(snapshot.discord?.configured || snapshot.discord?.running),
    Boolean(snapshot.signal?.configured || snapshot.signal?.running),
    Boolean(snapshot.imessage?.configured || snapshot.imessage?.running),
  ];
  return flags.filter(Boolean).length;
}

function pageKickerForTab(tab: Tab) {
  switch (tab) {
    case "overview":
      return "Today";
    case "chat":
      return "Workspace";
    case "build":
      return "Studio";
    case "connections":
      return "Setup";
    case "sessions":
      return "History";
    case "dashboard":
      return "Wellbeing";
    case "config":
      return "Identity";
    case "debug":
      return "Advanced";
    default:
      return "Control";
  }
}

function resolvePaletteResults(query: string) {
  const allTabs = TAB_GROUPS.flatMap((group) => group.tabs);
  const needle = query.trim().toLowerCase();
  return allTabs
    .filter((tab, index, arr) => arr.indexOf(tab) === index)
    .map((tab) => ({
      tab,
      title: titleForTab(tab),
      subtitle: subtitleForTab(tab),
    }))
    .filter((entry) => {
      if (!needle) return true;
      return `${entry.title} ${entry.subtitle}`.toLowerCase().includes(needle);
    })
    .slice(0, 8);
}

function renderCommandPalette(
  state: AppViewState,
  results: Array<{ tab: Tab; title: string; subtitle: string }>,
) {
  return html`
    <div class="palette-backdrop" @click=${() => state.closePalette()}>
      <section class="palette" @click=${(event: Event) => event.stopPropagation()}>
        <div class="palette-search">
          <input
            autofocus
            .value=${state.paletteQuery}
            @input=${(event: Event) => {
              state.paletteQuery = (event.target as HTMLInputElement).value;
            }}
            placeholder="Search pages, core settings, and workspaces"
          />
        </div>
        <div class="palette-results">
          ${results.map(
            (entry) => html`
              <button
                class="palette-item ${state.tab === entry.tab ? "active" : ""}"
                @click=${() => state.setTab(entry.tab)}
              >
                <span class="palette-item__title">${entry.title}</span>
                <span class="palette-item__sub">${entry.subtitle}</span>
              </button>
            `,
          )}
          ${results.length === 0 ? html`<div class="palette-empty">No matches yet.</div>` : nothing}
        </div>
      </section>
    </div>
  `;
}

const THEME_ORDER: ThemeMode[] = ["system", "light", "dark"];

function renderThemeToggle(state: AppViewState) {
  const index = Math.max(0, THEME_ORDER.indexOf(state.theme));
  const applyTheme = (next: ThemeMode) => (event: MouseEvent) => {
    const element = event.currentTarget as HTMLElement;
    const context: ThemeTransitionContext = { element };
    if (event.clientX || event.clientY) {
      context.pointerClientX = event.clientX;
      context.pointerClientY = event.clientY;
    }
    state.setTheme(next, context);
  };

  return html`
    <div class="theme-toggle" style="--theme-index: ${index};">
      <div class="theme-toggle__track" role="group" aria-label="Theme">
        <span class="theme-toggle__indicator"></span>
        <button
          class="theme-toggle__button ${state.theme === "system" ? "active" : ""}"
          @click=${applyTheme("system")}
          aria-pressed=${state.theme === "system"}
          aria-label="System theme"
          title="System"
        >
          ${renderMonitorIcon()}
        </button>
        <button
          class="theme-toggle__button ${state.theme === "light" ? "active" : ""}"
          @click=${applyTheme("light")}
          aria-pressed=${state.theme === "light"}
          aria-label="Light theme"
          title="Light"
        >
          ${renderSunIcon()}
        </button>
        <button
          class="theme-toggle__button ${state.theme === "dark" ? "active" : ""}"
          @click=${applyTheme("dark")}
          aria-pressed=${state.theme === "dark"}
          aria-label="Dark theme"
          title="Dark"
        >
          ${renderMoonIcon()}
        </button>
      </div>
    </div>
  `;
}

function renderSunIcon() {
  return html`
    <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2"></path>
      <path d="M12 20v2"></path>
      <path d="m4.93 4.93 1.41 1.41"></path>
      <path d="m17.66 17.66 1.41 1.41"></path>
      <path d="M2 12h2"></path>
      <path d="M20 12h2"></path>
      <path d="m6.34 17.66-1.41 1.41"></path>
      <path d="m19.07 4.93-1.41 1.41"></path>
    </svg>
  `;
}

function renderMoonIcon() {
  return html`
    <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"
      ></path>
    </svg>
  `;
}

function renderMonitorIcon() {
  return html`
    <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="20" height="14" x="2" y="3" rx="2"></rect>
      <line x1="8" x2="16" y1="21" y2="21"></line>
      <line x1="12" x2="12" y1="17" y2="21"></line>
    </svg>
  `;
}


