import { existsSync, readFileSync, writeFileSync } from "node:fs";

export type RuntimeState = {
  apiEnabled: boolean;
  botEnabled: boolean;
  botHeartbeatAt: string | null;
  updatedAt: string | null;
};

const CONTROL_FILE = process.env.X23_CONTROL_FILE ?? "/tmp/x23-hub-control.json";
const defaults: RuntimeState = { apiEnabled: true, botEnabled: true, botHeartbeatAt: null, updatedAt: null };

export function readRuntimeState(): RuntimeState {
  try {
    if (!existsSync(CONTROL_FILE)) return defaults;
    const parsed = JSON.parse(readFileSync(CONTROL_FILE, "utf8")) as Partial<RuntimeState>;
    return {
      apiEnabled: parsed.apiEnabled !== false,
      botEnabled: parsed.botEnabled !== false,
      botHeartbeatAt: parsed.botHeartbeatAt ?? null,
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch {
    return defaults;
  }
}

export function updateRuntimeState(
  patch: Partial<Pick<RuntimeState, "apiEnabled" | "botEnabled" | "botHeartbeatAt">>,
): RuntimeState {
  const next: RuntimeState = {
    ...readRuntimeState(),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(CONTROL_FILE, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function touchBotHeartbeat(): RuntimeState {
  return updateRuntimeState({ botHeartbeatAt: new Date().toISOString() });
}