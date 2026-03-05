import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export async function ensureDir(dir: string) {
  await fs.promises.mkdir(dir, { recursive: true });
}

export async function appendJsonl<T>(filePath: string, row: T) {
  await ensureDir(path.dirname(filePath));
  await fs.promises.appendFile(filePath, `${JSON.stringify(row)}\n`, "utf8");
}

export async function readJsonl<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await fs.promises.readFile(filePath, "utf8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
}

export async function writeJsonl<T>(filePath: string, rows: T[]) {
  await ensureDir(path.dirname(filePath));
  const body = rows.map((row) => JSON.stringify(row)).join("\n");
  await fs.promises.writeFile(filePath, body ? `${body}\n` : "", "utf8");
}

export function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function getKeyBytes(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptText(
  plain: string,
  secret?: string,
): string | undefined {
  if (!secret?.trim()) return undefined;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKeyBytes(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plain, "utf8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptText(
  cipherText: string,
  secret?: string,
): string | null {
  if (!secret?.trim()) return null;
  try {
    const payload = Buffer.from(cipherText, "base64");
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const body = payload.subarray(28);
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getKeyBytes(secret),
      iv,
    );
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(body), decipher.final()]);
    return plain.toString("utf8");
  } catch {
    return null;
  }
}
