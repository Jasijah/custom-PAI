import fs from "node:fs";
import path from "node:path";
import { ensureDir } from "./storage.js";
import { grantPermission } from "./trust-center.js";

export type MiyaProfile = {
  initializedAt: number;
  displayName: string;
  timezone: string;
  goals: string[];
  boundaries: string[];
  tone: "calm" | "neutral" | "direct";
  avoidReligionMentions: boolean;
};

export async function ensureMiyaOnboarding(params: {
  baseDir: string;
  profileSeed?: Partial<MiyaProfile>;
}) {
  await ensureDir(params.baseDir);
  const profilePath = path.join(params.baseDir, "profile.json");
  if (fs.existsSync(profilePath)) {
    const raw = await fs.promises.readFile(profilePath, "utf8");
    return JSON.parse(raw) as MiyaProfile;
  }

  const profile: MiyaProfile = {
    initializedAt: Date.now(),
    displayName: params.profileSeed?.displayName ?? "Miya User",
    timezone:
      params.profileSeed?.timezone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    goals: params.profileSeed?.goals ?? ["focus", "health", "relationships"],
    boundaries: params.profileSeed?.boundaries ?? ["no silent actions"],
    tone: params.profileSeed?.tone ?? "calm",
    avoidReligionMentions: params.profileSeed?.avoidReligionMentions ?? true,
  };

  await fs.promises.writeFile(
    profilePath,
    JSON.stringify(profile, null, 2),
    "utf8",
  );

  await grantPermission({
    baseDir: params.baseDir,
    scope: "suggestions",
    grantSource: "onboarding",
  });
  await grantPermission({
    baseDir: params.baseDir,
    scope: "memoryWrite",
    grantSource: "onboarding",
  });

  return profile;
}
