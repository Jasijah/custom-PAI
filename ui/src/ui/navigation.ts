export const TAB_GROUPS = [
  { label: "Daily", tabs: ["chat", "build", "dashboard", "memory", "agents"] },
  {
    label: "Home",
    tabs: ["overview", "config", "brand", "connections", "sessions", "instances", "cron"],
  },
  { label: "Advanced", tabs: ["trust", "skills", "nodes", "economy", "debug"] },
] as const;

export type Tab =
  | "overview"
  | "connections"
  | "instances"
  | "sessions"
  | "cron"
  | "skills"
  | "nodes"
  | "chat"
  | "build"
  | "memory"
  | "agents"
  | "trust"
  | "dashboard"
  | "economy"
  | "config"
  | "brand"
  | "debug";

const TAB_PATHS: Record<Tab, string> = {
  overview: "/overview",
  connections: "/connections",
  instances: "/instances",
  sessions: "/sessions",
  cron: "/cron",
  skills: "/skills",
  nodes: "/nodes",
  chat: "/chat",
  build: "/build",
  memory: "/memory",
  agents: "/agents",
  trust: "/trust",
  dashboard: "/dashboard",
  economy: "/economy",
  config: "/core",
  brand: "/brand",
  debug: "/debug",
};

const PATH_TO_TAB = new Map(
  Object.entries(TAB_PATHS).map(([tab, path]) => [path, tab as Tab]),
);
PATH_TO_TAB.set("/config", "config");

function normalizeBasePath(basePath: string): string {
  if (!basePath) return "";
  let base = basePath.trim();
  if (!base.startsWith("/")) base = `/${base}`;
  if (base === "/") return "";
  if (base.endsWith("/")) base = base.slice(0, -1);
  return base;
}

export function normalizePath(path: string): string {
  if (!path) return "/";
  let normalized = path.trim();
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export function pathForTab(tab: Tab, basePath = ""): string {
  const base = normalizeBasePath(basePath);
  const path = TAB_PATHS[tab];
  return base ? `${base}${path}` : path;
}

export function tabFromPath(pathname: string, basePath = ""): Tab | null {
  const base = normalizeBasePath(basePath);
  let path = pathname || "/";
  if (base) {
    if (path === base) {
      path = "/";
    } else if (path.startsWith(`${base}/`)) {
      path = path.slice(base.length);
    }
  }
  let normalized = normalizePath(path).toLowerCase();
  if (normalized.endsWith("/index.html")) normalized = "/";
  if (normalized === "/") return "chat";
  return PATH_TO_TAB.get(normalized) ?? null;
}

export function titleForTab(tab: Tab) {
  switch (tab) {
    case "overview":
      return "Home";
    case "connections":
      return "Linked Apps";
    case "instances":
      return "Devices";
    case "sessions":
      return "Conversations";
    case "cron":
      return "Routines";
    case "skills":
      return "Skills";
    case "nodes":
      return "Connected Nodes";
    case "chat":
      return "Talk";
    case "build":
      return "Build";
    case "memory":
      return "Memory";
    case "agents":
      return "Suggestions";
    case "trust":
      return "Privacy & Access";
    case "dashboard":
      return "Daily Rhythm";
    case "economy":
      return "Budget";
    case "config":
      return "Core";
    case "brand":
      return "Brand";
    case "debug":
      return "Developer Tools";
    default:
      return "Control";
  }
}

export function subtitleForTab(tab: Tab) {
  switch (tab) {
    case "overview":
      return "A calm home view with health, activity, and the next thing to do.";
    case "connections":
      return "Connect Gemini and messaging apps in one setup-focused place.";
    case "instances":
      return "See which phones, browsers, and clients are currently available.";
    case "sessions":
      return "Browse recent conversations and tune per-session behavior.";
    case "cron":
      return "Schedule reminders, wakeups, and recurring assistant runs.";
    case "skills":
      return "Manage skill availability and API key injection.";
    case "nodes":
      return "Inspect paired nodes, capabilities, and command access.";
    case "chat":
      return "Your main everyday workspace for talking, listening, and following along.";
    case "build":
      return "Create app ideas, shape them, and preview them live without leaving the assistant.";
    case "memory":
      return "Search saved context and capture important things worth remembering.";
    case "agents":
      return "Review assistant suggestions and turn them into next steps.";
    case "trust":
      return "Control permissions, grants, and the audit history.";
    case "dashboard":
      return "A personal planning surface for priorities, wellbeing, and momentum.";
    case "economy":
      return "Track how your assistant budget is allocated.";
    case "config":
      return "Personalize identity, switch brains, and tune how your assistant speaks to you.";
    case "brand":
      return "A dedicated home for the PAI brand system, assets, and visual direction.";
    case "debug":
      return "Raw snapshots, logs, and manual tools for troubleshooting.";
    default:
      return "";
  }
}
