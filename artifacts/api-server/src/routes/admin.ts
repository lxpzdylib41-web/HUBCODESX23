import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { ADMIN_PAGE } from "./admin-page.js";
import { readRuntimeState, updateRuntimeState } from "../lib/runtime-control.js";

const router: IRouter = Router();
const sessions = new Set<string>();
const COOKIE = "x23_admin_session";

function configuredPassword() {
  return process.env.ADMIN_PANEL_PASSWORD ?? process.env.BOT_SECRET ?? "";
}

function cookies(req: Request) {
  return Object.fromEntries((req.headers.cookie ?? "").split(";").filter(Boolean).map((part) => {
    const [key, ...value] = part.trim().split("=");
    return [key, decodeURIComponent(value.join("="))];
  }));
}

function isValidPassword(value: unknown) {
  if (typeof value !== "string" || !configuredPassword()) return false;
  const actual = Buffer.from(value);
  const expected = Buffer.from(configuredPassword());
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function isAdminSession(req: Request): boolean {
  const session = cookies(req)[COOKIE];
  return Boolean(session && sessions.has(session));
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isAdminSession(req)) {
    res.status(401).json({ ok: false, message: "Sesión administrativa requerida." });
    return;
  }
  next();
}

function statusPayload() {
  const runtime = readRuntimeState();
  const heartbeatAge = runtime.botHeartbeatAt ? Date.now() - Date.parse(runtime.botHeartbeatAt) : Infinity;
  return {
    state: {
      ...runtime,
      botOnline: runtime.botEnabled && heartbeatAge < 90_000,
    },
  };
}

router.get("/admin", (_req, res) => {
  res.type("html").send(ADMIN_PAGE);
});

router.post("/admin/login", (req, res) => {
  if (!isValidPassword(req.body?.password)) {
    res.status(401).json({ ok: false, message: "Contraseña incorrecta." });
    return;
  }
  const session = randomBytes(32).toString("hex");
  sessions.add(session);
  res.cookie(COOKIE, session, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 86_400_000 });
  res.json({ ok: true });
});

router.post("/admin/logout", (req, res) => {
  const session = cookies(req)[COOKIE];
  if (session) sessions.delete(session);
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

router.get("/admin/status", requireAdmin, (_req, res) => {
  res.json({ ok: true, ...statusPayload() });
});

router.post("/admin/control", requireAdmin, (req, res) => {
  const patch: { apiEnabled?: boolean; botEnabled?: boolean } = {};
  if (typeof req.body?.apiEnabled === "boolean") patch.apiEnabled = req.body.apiEnabled;
  if (typeof req.body?.botEnabled === "boolean") patch.botEnabled = req.body.botEnabled;
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ ok: false, message: "No se indicó ningún cambio." });
    return;
  }
  updateRuntimeState(patch);
  res.json({ ok: true, ...statusPayload() });
});

export default router;