import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

const CONFIG_FILE = resolve(process.cwd(), "bot-config.json");

interface BotConfig {
  auditChannelId?: string;
  alertChannelId?: string;
}

let cfg: BotConfig = {};
try {
  if (existsSync(CONFIG_FILE)) cfg = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
} catch {}

export const getConfig = (): BotConfig => cfg;
export function setConfig(update: Partial<BotConfig>): void {
  cfg = { ...cfg, ...update };
  try { writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2)); } catch {}
}
