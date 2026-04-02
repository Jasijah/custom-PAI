import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveUserPath } from "../utils.js";

const DEFAULT_WORKSPACE_ENV =
  process.env.CLAWDIS_WORKSPACE?.trim() ||
  process.env.CLAWDIS_AGENT_WORKSPACE?.trim();

export const DEFAULT_AGENT_WORKSPACE_DIR = resolveUserPath(
  DEFAULT_WORKSPACE_ENV || path.join(os.homedir(), "clawd"),
);
export const DEFAULT_AGENTS_FILENAME = "AGENTS.md";
export const DEFAULT_SOUL_FILENAME = "SOUL.md";
export const DEFAULT_TOOLS_FILENAME = "TOOLS.md";
export const DEFAULT_IDENTITY_FILENAME = "IDENTITY.md";
export const DEFAULT_USER_FILENAME = "USER.md";
export const DEFAULT_BOOTSTRAP_FILENAME = "BOOTSTRAP.md";

const DEFAULT_AGENTS_TEMPLATE = `# AGENTS.md - Miya Workspace

This folder is the assistant's working directory.

## First run (one-time)
- If BOOTSTRAP.md exists, treat it as a private onboarding guide.
- The first conversation should feel like meeting a thoughtful new advisor, assistant, or friend.
- Keep the interaction natural and warm. Do not narrate file reads, setup steps, or internal reasoning.
- Ask one or two questions at a time, listen carefully, and help the user shape who you are together.
- Delete BOOTSTRAP.md once onboarding is genuinely complete.
- Your agent identity lives in IDENTITY.md.
- Your profile lives in USER.md.

## Backup tip (recommended)
If you treat this workspace as the agent's "memory", make it a git repo (ideally private) so identity
and notes are backed up.

\`\`\`bash
git init
git add AGENTS.md
git commit -m "Add agent workspace"
\`\`\`

## Safety defaults
- Don't exfiltrate secrets or private data.
- Don't run destructive commands unless explicitly asked.
- Be concise in chat; write longer output to files in this workspace.

## Daily memory (recommended)
- Keep a short daily log at memory/YYYY-MM-DD.md (create memory/ if needed).
- On session start, read today + yesterday if present.
- Capture durable facts, preferences, and decisions; avoid secrets.

## Customize
- Add your preferred style, rules, and "memory" here.
`;

const DEFAULT_SOUL_TEMPLATE = `# SOUL.md - Persona & Boundaries

Describe who the assistant is, tone, and boundaries.

- Keep replies concise and direct.
- Ask clarifying questions when needed.
- Never send streaming/partial replies to external messaging surfaces.
`;

const DEFAULT_TOOLS_TEMPLATE = `# TOOLS.md - User Tool Notes (editable)

This file is for *your* notes about external tools and conventions.
It does not define which tools exist; Clawdis provides built-in tools internally.

## Examples

### imsg
- Send an iMessage/SMS: describe who/what, confirm before sending.
- Prefer short messages; avoid sending secrets.

### sag
- Text-to-speech: specify voice, target speaker/room, and whether to stream.

Add whatever else you want the assistant to know about your local toolchain.
`;

const DEFAULT_BOOTSTRAP_TEMPLATE = `# BOOTSTRAP.md - First Meeting Guide

This file is private guidance for your first conversation with the user.

## The Goal
Your first interaction should feel like meeting a new advisor, assistant, or friend.
Warm. Curious. Helpful. Human.

Do not make the user watch your setup process.
Do not narrate file reads, tools, or internal steps unless they explicitly ask.

## How to Begin
Open with something simple and grounded, like:
"Hi Jasijah. I'm Miya. I'm here with you now. Before we dive into work, I want to get a feel for how you'd like us to work together."

Then ease into a real conversation:
- What should I call you?
- How would you like me to show up for you: more like an advisor, assistant, creative partner, grounding friend, or a mix?
- What tone feels best: warm, direct, calm, playful, strategic?
- What would make this feel genuinely helpful in your everyday life?

Ask only one or two questions at a time.
Respond to what they actually say.
Offer suggestions if they want help deciding, but don't interrogate them.

## What to Learn Together
Use the conversation to figure out:
1. Who you are to them
2. How personal or professional they want the relationship to feel
3. What they want to be called
4. What kind of tone and behavior earns trust
5. Any early boundaries or preferences

## After You Learn Enough
Update:

1) IDENTITY.md
- Name
- Nature / role
- Vibe
- Emoji

2) USER.md
- Name
- Preferred address
- Pronouns (optional)
- Timezone (optional)
- Notes

3) SOUL.md
- What matters to them
- How they want you to behave
- Boundaries and preferences

4) ~/.clawdis/clawdis.json
Set identity.name, identity.theme, and identity.emoji to match IDENTITY.md.

## Important Style Rule
The user should experience a meaningful first conversation, not a setup wizard.
Use the files quietly in the background to remember what matters.

## Cleanup
Delete BOOTSTRAP.md once the relationship setup is real enough that you no longer need this guide.
`;

const DEFAULT_IDENTITY_TEMPLATE = `# IDENTITY.md - Agent Identity

- Name:
- Creature:
- Vibe:
- Emoji:
`;

const DEFAULT_USER_TEMPLATE = `# USER.md - User Profile

- Name:
- Preferred address:
- Pronouns (optional):
- Timezone (optional):
- Notes:
`;

const TEMPLATE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../docs/templates",
);

function stripFrontMatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const endIndex = content.indexOf("\n---", 3);
  if (endIndex === -1) return content;
  const start = endIndex + "\n---".length;
  let trimmed = content.slice(start);
  trimmed = trimmed.replace(/^\s+/, "");
  return trimmed;
}

async function loadTemplate(name: string, fallback: string): Promise<string> {
  const templatePath = path.join(TEMPLATE_DIR, name);
  try {
    const content = await fs.readFile(templatePath, "utf-8");
    return stripFrontMatter(content);
  } catch {
    return fallback;
  }
}

export type WorkspaceBootstrapFileName =
  | typeof DEFAULT_AGENTS_FILENAME
  | typeof DEFAULT_SOUL_FILENAME
  | typeof DEFAULT_TOOLS_FILENAME
  | typeof DEFAULT_IDENTITY_FILENAME
  | typeof DEFAULT_USER_FILENAME
  | typeof DEFAULT_BOOTSTRAP_FILENAME;

export type WorkspaceBootstrapFile = {
  name: WorkspaceBootstrapFileName;
  path: string;
  content?: string;
  missing: boolean;
};

async function writeFileIfMissing(filePath: string, content: string) {
  try {
    await fs.writeFile(filePath, content, {
      encoding: "utf-8",
      flag: "wx",
    });
  } catch (err) {
    const anyErr = err as { code?: string };
    if (anyErr.code !== "EEXIST") throw err;
  }
}

export async function ensureAgentWorkspace(params?: {
  dir?: string;
  ensureBootstrapFiles?: boolean;
}): Promise<{
  dir: string;
  agentsPath?: string;
  soulPath?: string;
  toolsPath?: string;
  identityPath?: string;
  userPath?: string;
  bootstrapPath?: string;
}> {
  const rawDir = params?.dir?.trim()
    ? params.dir.trim()
    : DEFAULT_AGENT_WORKSPACE_DIR;
  const dir = resolveUserPath(rawDir);
  await fs.mkdir(dir, { recursive: true });

  if (!params?.ensureBootstrapFiles) return { dir };

  const agentsPath = path.join(dir, DEFAULT_AGENTS_FILENAME);
  const soulPath = path.join(dir, DEFAULT_SOUL_FILENAME);
  const toolsPath = path.join(dir, DEFAULT_TOOLS_FILENAME);
  const identityPath = path.join(dir, DEFAULT_IDENTITY_FILENAME);
  const userPath = path.join(dir, DEFAULT_USER_FILENAME);
  const bootstrapPath = path.join(dir, DEFAULT_BOOTSTRAP_FILENAME);

  const agentsTemplate = await loadTemplate(
    DEFAULT_AGENTS_FILENAME,
    DEFAULT_AGENTS_TEMPLATE,
  );
  const soulTemplate = await loadTemplate(
    DEFAULT_SOUL_FILENAME,
    DEFAULT_SOUL_TEMPLATE,
  );
  const toolsTemplate = await loadTemplate(
    DEFAULT_TOOLS_FILENAME,
    DEFAULT_TOOLS_TEMPLATE,
  );
  const identityTemplate = await loadTemplate(
    DEFAULT_IDENTITY_FILENAME,
    DEFAULT_IDENTITY_TEMPLATE,
  );
  const userTemplate = await loadTemplate(
    DEFAULT_USER_FILENAME,
    DEFAULT_USER_TEMPLATE,
  );
  const bootstrapTemplate = await loadTemplate(
    DEFAULT_BOOTSTRAP_FILENAME,
    DEFAULT_BOOTSTRAP_TEMPLATE,
  );

  await writeFileIfMissing(agentsPath, agentsTemplate);
  await writeFileIfMissing(soulPath, soulTemplate);
  await writeFileIfMissing(toolsPath, toolsTemplate);
  await writeFileIfMissing(identityPath, identityTemplate);
  await writeFileIfMissing(userPath, userTemplate);
  await writeFileIfMissing(bootstrapPath, bootstrapTemplate);

  return {
    dir,
    agentsPath,
    soulPath,
    toolsPath,
    identityPath,
    userPath,
    bootstrapPath,
  };
}

export async function loadWorkspaceBootstrapFiles(
  dir: string,
): Promise<WorkspaceBootstrapFile[]> {
  const resolvedDir = resolveUserPath(dir);

  const entries: Array<{
    name: WorkspaceBootstrapFileName;
    filePath: string;
  }> = [
    {
      name: DEFAULT_AGENTS_FILENAME,
      filePath: path.join(resolvedDir, DEFAULT_AGENTS_FILENAME),
    },
    {
      name: DEFAULT_SOUL_FILENAME,
      filePath: path.join(resolvedDir, DEFAULT_SOUL_FILENAME),
    },
    {
      name: DEFAULT_TOOLS_FILENAME,
      filePath: path.join(resolvedDir, DEFAULT_TOOLS_FILENAME),
    },
    {
      name: DEFAULT_IDENTITY_FILENAME,
      filePath: path.join(resolvedDir, DEFAULT_IDENTITY_FILENAME),
    },
    {
      name: DEFAULT_USER_FILENAME,
      filePath: path.join(resolvedDir, DEFAULT_USER_FILENAME),
    },
    {
      name: DEFAULT_BOOTSTRAP_FILENAME,
      filePath: path.join(resolvedDir, DEFAULT_BOOTSTRAP_FILENAME),
    },
  ];

  const result: WorkspaceBootstrapFile[] = [];
  for (const entry of entries) {
    try {
      const content = await fs.readFile(entry.filePath, "utf-8");
      result.push({
        name: entry.name,
        path: entry.filePath,
        content,
        missing: false,
      });
    } catch {
      result.push({ name: entry.name, path: entry.filePath, missing: true });
    }
  }
  return result;
}
