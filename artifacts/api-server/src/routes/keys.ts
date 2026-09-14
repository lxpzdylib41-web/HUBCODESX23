import { Router, type IRouter } from "express";
import { eq, desc, isNotNull, isNull, and, ilike, count, sql } from "drizzle-orm";
import { db, keysTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { isAdminSession } from "./admin.js";
import type { Request, Response, NextFunction } from "express";

const router: IRouter = Router();

function botAuth(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.BOT_SECRET;
  const headerSecret = req.headers["x-bot-secret"];
  const validBotSecret = Boolean(secret && typeof headerSecret === "string" && headerSecret === secret);

  // Permite administrar keys desde el panel web después del login,
  // sin exponer BOT_SECRET al navegador. El bot de Discord sigue
  // usando x-bot-secret como antes.
  if (!validBotSecret && !isAdminSession(req)) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  next();
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

function normalizeProductId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const rawProductId = value.trim().toLowerCase();
  const productId = rawProductId === "x23-main" ? "legacy" : rawProductId === "x23-clone" ? "premium" : rawProductId;
  return /^[a-z0-9][a-z0-9-]{1,39}$/.test(productId) ? productId : null;
}

// Keys administrativas globales: no se atan a un producto ni a un HWID.
// Se mantienen explícitas para que una key normal nunca pueda saltarse
// la separación Legacy/Premium.
const GLOBAL_ADMIN_KEYS = new Set(["YERIM"]);

// ── POST /api/keys/validate ──────────────────────────────────
router.post("/keys/validate", async (req, res): Promise<void> => {
  const { key, hwid, productId, platform, deviceModel, robloxVersion } = req.body as {
    key?: string; hwid?: string;
    productId?: string;
    platform?: string; deviceModel?: string; robloxVersion?: string;
  };
  const ipAddress = ((req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()) ?? req.ip ?? null;
  if (!key || typeof key !== "string") {
    res.status(400).json({ valid: false, message: "Key requerida" });
    return;
  }

  const cleanHwid = hwid && typeof hwid === "string" ? hwid.trim() : null;
  const cleanProductId = normalizeProductId(productId);
  if (!cleanProductId) {
    res.status(400).json({ valid: false, message: "Loader no identificado" });
    return;
  }

  const [row] = await db
    .select()
    .from(keysTable)
    .where(eq(keysTable.key, key.trim().toUpperCase()));

  if (!row || !row.isActive) {
    res.json({ valid: false, message: "Key inválida o desactivada" });
    return;
  }

  const isGlobalAdminKey = GLOBAL_ADMIN_KEYS.has(row.key);

  if (row.productId !== cleanProductId && !isGlobalAdminKey) {
    res.json({ valid: false, message: "Esta key pertenece a otro script" });
    return;
  }

  const now = new Date();

  // Primera activación: arrancar el contador y guardar HWID
  if (!row.activatedAt) {
    let expiresAt: Date | null = null;
    if (row.type === "timed" && row.durationMinutes) {
      expiresAt = new Date(now.getTime() + row.durationMinutes * 60_000);
    }
    await db.update(keysTable).set({
      activatedAt: now,
      lastUsedAt: now,
      usageCount: 1,
      expiresAt,
      hwid: isGlobalAdminKey ? null : cleanHwid,
      ipAddress: ipAddress ?? null,
      platform: platform?.trim() || null,
      deviceModel: deviceModel?.trim() || null,
      robloxVersion: robloxVersion?.trim() || null,
    }).where(eq(keysTable.key, row.key));

    res.json({
      valid: true,
      type: row.type,
      expiresAt: expiresAt ?? null,
      assignedTo: row.assignedTo ?? null,
      message: "Key válida ✅",
    });
    return;
  }

  // Verificar HWID — si la key tiene HWID registrado, el incoming DEBE coincidir exactamente
  // Se bloquea aunque no manden hwid (null != "ABC") o manden uno diferente
  if (!isGlobalAdminKey && row.hwid && row.hwid !== cleanHwid) {
    res.json({ valid: false, message: "Key vinculada a otro dispositivo" });
    return;
  }

  // Verificar expiración
  if (row.type === "timed" && row.expiresAt && row.expiresAt <= now) {
    await db.update(keysTable).set({ isActive: false }).where(eq(keysTable.key, row.key));
    res.json({ valid: false, message: "Key expirada" });
    return;
  }

  // Actualizar uso y device info (HWID no se toca — queda el del primer uso)
  await db.update(keysTable).set({
    lastUsedAt: now,
    usageCount: (row.usageCount ?? 0) + 1,
    ipAddress: ipAddress ?? row.ipAddress,
    ...(platform ? { platform: platform.trim() } : {}),
    ...(deviceModel ? { deviceModel: deviceModel.trim() } : {}),
    ...(robloxVersion ? { robloxVersion: robloxVersion.trim() } : {}),
  }).where(eq(keysTable.key, row.key));

  res.json({
    valid: true,
    type: row.type,
    expiresAt: row.expiresAt ?? null,
    assignedTo: row.assignedTo ?? null,
    message: "Key válida ✅",
  });
});

// ── POST /api/keys/generate ──────────────────────────────────
router.post("/keys/generate", botAuth, async (req, res): Promise<void> => {
  const { type, duration, unit, createdBy, createdByName, assignedTo, customKey, prefix, productId } = req.body as {
    type?: string;
    duration?: number;
    unit?: "minutes" | "hours" | "days";
    createdBy?: string;
    createdByName?: string;
    assignedTo?: string;
    customKey?: string;
    prefix?: string;
    productId?: string;
  };

  const cleanProductId = normalizeProductId(productId ?? "legacy");
  if (!cleanProductId) {
    res.status(400).json({ error: "script inválido" });
    return;
  }
  if (type !== "permanent" && type !== "timed") {
    res.status(400).json({ error: "type debe ser 'permanent' o 'timed'" });
    return;
  }
  if (type === "timed" && (!duration || duration < 1)) {
    res.status(400).json({ error: "duration requerido para keys de tiempo" });
    return;
  }

  let totalMinutes: number | null = null;
  if (type === "timed" && duration) {
    if (unit === "minutes") totalMinutes = duration;
    else if (unit === "hours") totalMinutes = duration * 60;
    else totalMinutes = duration * 1440;
  }

  // ── Determinar la clave final ─────────────────────────────
  let newKey: string;
  if (customKey) {
    const cleaned = customKey.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9\-]{2,28}[A-Z0-9]$/.test(cleaned)) {
      res.status(400).json({ error: "La clave personalizada solo puede tener letras, números y guiones (4–30 caracteres)." });
      return;
    }
    const existing = await db.select().from(keysTable).where(eq(keysTable.key, cleaned)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Esa clave personalizada ya existe en el sistema." });
      return;
    }
    newKey = cleaned;
  } else {
    const usedPrefix = prefix
      ? prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "X23"
      : "X23";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const seg = () =>
      Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    newKey = `${usedPrefix}-${seg()}-${seg()}-${seg()}`;
  }

  const [row] = await db.insert(keysTable).values({
    key: newKey,
    productId: cleanProductId,
    type,
    durationMinutes: totalMinutes,
    expiresAt: null,
    createdBy: createdBy ?? null,
    createdByName: createdByName ?? null,
    assignedTo: assignedTo?.trim() || null,
    isActive: true,
  }).returning();

  const label = totalMinutes ? formatDuration(totalMinutes) : "permanente";
  logger.info({ keyPrefix: newKey.slice(0, 8) + "***", type, label, assignedTo }, "Key generada");

  res.status(201).json({
    key: row.key,
    productId: row.productId,
    type: row.type,
    durationMinutes: row.durationMinutes,
    assignedTo: row.assignedTo,
  });
});

// ── POST /api/keys/revoke ─────────────────────────────────────
router.post("/keys/revoke", botAuth, async (req, res): Promise<void> => {
  const { key } = req.body as { key?: string };
  if (!key) { res.status(400).json({ error: "Key requerida" }); return; }

  const [row] = await db.update(keysTable)
    .set({ isActive: false })
    .where(eq(keysTable.key, key.trim().toUpperCase()))
    .returning();

  if (!row) { res.status(404).json({ error: "Key no encontrada" }); return; }
  res.json({ success: true, key: row.key });
});

// ── DELETE /api/keys/delete ───────────────────────────────────
router.delete("/keys/delete", botAuth, async (req, res): Promise<void> => {
  const { key } = req.body as { key?: string };
  if (!key) { res.status(400).json({ error: "Key requerida" }); return; }

  const [row] = await db.delete(keysTable)
    .where(eq(keysTable.key, key.trim().toUpperCase()))
    .returning();

  if (!row) { res.status(404).json({ error: "Key no encontrada" }); return; }
  res.json({ success: true, key: row.key });
});

// ── POST /api/keys/renew ──────────────────────────────────────
// Solo extiende keys temporales. No convierte permanentes ni reactiva revocadas.
// Si la key aún no fue activada, solo incrementa durationMinutes (expiresAt sigue null).
// Si ya fue activada, extiende expiresAt desde el vencimiento actual (o desde ahora si ya expiró).
router.post("/keys/renew", botAuth, async (req, res): Promise<void> => {
  const { key, duration, unit } = req.body as {
    key?: string;
    duration?: number;
    unit?: "minutes" | "hours" | "days";
  };

  if (!key || !duration || duration < 1) {
    res.status(400).json({ error: "key y duration requeridos" }); return;
  }

  const [row] = await db.select().from(keysTable)
    .where(eq(keysTable.key, key.trim().toUpperCase()));

  if (!row) { res.status(404).json({ error: "Key no encontrada" }); return; }

  // Solo keys temporales
  if (row.type !== "timed") {
    res.status(400).json({ error: "Solo se pueden renovar keys temporales. Las permanentes no tienen expiración." });
    return;
  }
  // No reactivar revocadas
  if (!row.isActive) {
    res.status(400).json({ error: "La key está revocada. Revócala y genera una nueva en su lugar." });
    return;
  }

  let addMinutes = duration;
  if (unit === "hours") addMinutes = duration * 60;
  else if (unit === "days") addMinutes = duration * 1440;

  const newDuration = (row.durationMinutes ?? 0) + addMinutes;

  // Si nunca fue activada: solo ampliar durationMinutes, mantener expiresAt null
  // El contador sigue arrancando en la primera activación real.
  if (!row.activatedAt) {
    const [updated] = await db.update(keysTable).set({
      durationMinutes: newDuration,
    }).where(eq(keysTable.key, row.key)).returning();
    res.json({ success: true, key: updated.key, expiresAt: null, durationMinutes: updated.durationMinutes });
    return;
  }

  // Ya fue activada: extender expiresAt desde el vencimiento actual (o desde ahora si ya venció)
  const now = new Date();
  const base = row.expiresAt && row.expiresAt > now ? row.expiresAt : now;
  const newExpires = new Date(base.getTime() + addMinutes * 60_000);

  const [updated] = await db.update(keysTable).set({
    expiresAt: newExpires,
    durationMinutes: newDuration,
  }).where(eq(keysTable.key, row.key)).returning();

  res.json({ success: true, key: updated.key, expiresAt: updated.expiresAt, durationMinutes: updated.durationMinutes });
});

// ── POST /api/keys/assign ─────────────────────────────────────
router.post("/keys/assign", botAuth, async (req, res): Promise<void> => {
  const { key, assignedTo } = req.body as { key?: string; assignedTo?: string };
  if (!key) { res.status(400).json({ error: "Key requerida" }); return; }

  const [row] = await db.update(keysTable)
    .set({ assignedTo: assignedTo?.trim() || null })
    .where(eq(keysTable.key, key.trim().toUpperCase()))
    .returning();

  if (!row) { res.status(404).json({ error: "Key no encontrada" }); return; }
  res.json({ success: true, key: row.key, assignedTo: row.assignedTo });
});

// ── POST /api/keys/bulkrevoke ─────────────────────────────────
router.post("/keys/bulkrevoke", botAuth, async (_req, res): Promise<void> => {
  const now = new Date();
  const rows = await db.update(keysTable)
    .set({ isActive: false })
    .where(and(
      eq(keysTable.isActive, true),
       sql`${keysTable.expiresAt} <= ${now}`,
    ))
    .returning();

  res.json({ success: true, revoked: rows.length });
});

// ── GET /api/keys/stats ───────────────────────────────────────
router.get("/keys/stats", botAuth, async (_req, res): Promise<void> => {
  const now = new Date();
  const all = await db.select().from(keysTable);

  const total = all.length;
  const active = all.filter(r => r.isActive && !(r.type === "timed" && r.expiresAt && r.expiresAt <= now)).length;
  const expired = all.filter(r => r.type === "timed" && r.expiresAt && r.expiresAt <= now).length;
  const revoked = all.filter(r => !r.isActive).length;
  const permanent = all.filter(r => r.type === "permanent").length;
  const timed = all.filter(r => r.type === "timed").length;
  const activated = all.filter(r => r.activatedAt !== null).length;
  const pending = all.filter(r => r.activatedAt === null && r.isActive).length;
  const totalUses = all.reduce((s, r) => s + (r.usageCount ?? 0), 0);

  res.json({ total, active, expired, revoked, permanent, timed, activated, pending, totalUses });
});

// ── GET /api/keys/search ──────────────────────────────────────
router.get("/keys/search", botAuth, async (req, res): Promise<void> => {
  const q = (req.query.q as string ?? "").trim();
  if (!q) { res.status(400).json({ error: "Parámetro q requerido" }); return; }

  const rows = await db.select().from(keysTable)
    .where(ilike(keysTable.assignedTo, `%${q}%`))
    .orderBy(desc(keysTable.createdAt))
    .limit(10);

  res.json(rows);
});

// ── GET /api/keys/list ────────────────────────────────────────
router.get("/keys/list", botAuth, async (req, res): Promise<void> => {
  const requestedProduct = req.query.productId ?? req.query.script;
  const productId = requestedProduct ? normalizeProductId(requestedProduct) : null;
  if (requestedProduct && !productId) {
    res.status(400).json({ error: "script inválido" });
    return;
  }
  const rows = productId
    ? await db.select().from(keysTable).where(eq(keysTable.productId, productId)).orderBy(desc(keysTable.createdAt)).limit(25)
    : await db.select().from(keysTable).orderBy(desc(keysTable.createdAt)).limit(25);
  res.json(rows);
});

// ── GET /api/keys/history ─────────────────────────────────────
router.get("/keys/history", botAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(keysTable)
    .where(isNotNull(keysTable.lastUsedAt))
    .orderBy(desc(keysTable.lastUsedAt))
    .limit(15);
  res.json(rows);
});

// ── POST /api/keys/resethwid ──────────────────────────────────
router.post("/keys/resethwid", botAuth, async (req, res): Promise<void> => {
  const { key } = req.body as { key?: string };
  if (!key) { res.status(400).json({ error: "Key requerida" }); return; }

  const [row] = await db.update(keysTable)
    .set({ hwid: null, activatedAt: null })
    .where(eq(keysTable.key, key.trim().toUpperCase()))
    .returning();

  if (!row) { res.status(404).json({ error: "Key no encontrada" }); return; }
  res.json({ success: true, key: row.key });
});

// ── POST /api/keys/generate-bulk ─────────────────────────────
router.post("/keys/generate-bulk", botAuth, async (req, res): Promise<void> => {
  const { count = 1, type, duration, unit, createdBy, createdByName, prefix, productId } = req.body as {
    count?: number; type?: string; duration?: number;
    unit?: "minutes" | "hours" | "days"; createdBy?: string; createdByName?: string; prefix?: string;
    productId?: string;
  };

  const cleanProductId = normalizeProductId(productId ?? "legacy");
  if (!cleanProductId) {
    res.status(400).json({ error: "script inválido" }); return;
  }
  if (type !== "permanent" && type !== "timed") {
    res.status(400).json({ error: "type debe ser 'permanent' o 'timed'" }); return;
  }
  if (type === "timed" && (!duration || duration < 1)) {
    res.status(400).json({ error: "duration requerido para keys temporales" }); return;
  }

  const total = Math.min(Math.max(1, count), 25);
  let totalMinutes: number | null = null;
  if (type === "timed" && duration) {
    if (unit === "minutes") totalMinutes = duration;
    else if (unit === "hours") totalMinutes = duration * 60;
    else totalMinutes = duration * 1440;
  }

  const usedPrefix = prefix ? prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "X23" : "X23";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

  const keys: string[] = [];
  for (let i = 0; i < total; i++) {
    const newKey = `${usedPrefix}-${seg()}-${seg()}-${seg()}`;
    try {
      await db.insert(keysTable).values({
        key: newKey, productId: cleanProductId, type, durationMinutes: totalMinutes, expiresAt: null,
        createdBy: createdBy ?? null, createdByName: createdByName ?? null,
        assignedTo: null, isActive: true,
      });
      keys.push(newKey);
    } catch {}
  }

  res.status(201).json({ keys, productId: cleanProductId, type, durationMinutes: totalMinutes });
});

// ── POST /api/keys/transfer ───────────────────────────────────
router.post("/keys/transfer", botAuth, async (req, res): Promise<void> => {
  const { key, newUser, resetHwid } = req.body as { key?: string; newUser?: string; resetHwid?: boolean };
  if (!key || !newUser) { res.status(400).json({ error: "key y newUser requeridos" }); return; }

  const updates: Record<string, any> = { assignedTo: newUser.trim() };
  if (resetHwid) { updates.hwid = null; updates.activatedAt = null; }

  const [row] = await db.update(keysTable).set(updates)
    .where(eq(keysTable.key, key.trim().toUpperCase())).returning();

  if (!row) { res.status(404).json({ error: "Key no encontrada" }); return; }
  res.json({ success: true, key: row.key, assignedTo: row.assignedTo });
});

// ── GET /api/keys/expiring-soon ───────────────────────────────
router.get("/keys/expiring-soon", botAuth, async (req, res): Promise<void> => {
  const hours = Math.max(1, parseInt((req.query.hours as string) ?? "24"));
  const now    = new Date();
  const future = new Date(now.getTime() + hours * 3_600_000);

  const rows = await db.select().from(keysTable)
    .where(and(
      eq(keysTable.isActive, true),
      eq(keysTable.type as any, "timed"),
      sql`${keysTable.expiresAt} > ${now}`,
      sql`${keysTable.expiresAt} < ${future}`,
    ));
  res.json(rows);
});

// ── GET /api/keys/export ──────────────────────────────────────
router.get("/keys/export", botAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(keysTable).orderBy(desc(keysTable.createdAt));
  res.json(rows);
});

// ── DELETE /api/keys/purgerevoked ────────────────────────────
// Elimina permanentemente todas las keys cuyo isActive = false
router.delete("/keys/purgerevoked", botAuth, async (_req, res): Promise<void> => {
  const rows = await db.delete(keysTable)
    .where(eq(keysTable.isActive, false))
    .returning();
  res.json({ success: true, deleted: rows.length });
});

// ── GET /api/keys/info/:key ───────────────────────────────────
router.get("/keys/info/:key", botAuth, async (req, res): Promise<void> => {
  const [row] = await db.select().from(keysTable)
    .where(eq(keysTable.key, req.params.key.toUpperCase()));
  if (!row) { res.status(404).json({ error: "Key no encontrada" }); return; }
  res.json(row);
});

export default router;
