import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { warningsTable } from "@workspace/db/schema";

const router: IRouter = Router();

function botAuth(req: any, res: any, next: any) {
  const secret = process.env.BOT_SECRET;
  if (!secret || req.headers["x-bot-secret"] !== secret) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  next();
}

// GET /warnings/:userId
router.get("/warnings/:userId", botAuth, async (req, res): Promise<void> => {
  const rows = await db.select().from(warningsTable)
    .where(eq(warningsTable.userId, req.params.userId))
    .orderBy(desc(warningsTable.createdAt));
  res.json(rows);
});

// POST /warnings/add
router.post("/warnings/add", botAuth, async (req, res): Promise<void> => {
  const { userId, username, reason, warnedBy, warnedByName, guildId } = req.body as {
    userId?: string; username?: string; reason?: string;
    warnedBy?: string; warnedByName?: string; guildId?: string;
  };
  if (!userId || !username || !reason || !warnedBy || !warnedByName || !guildId) {
    res.status(400).json({ error: "Faltan campos requeridos" }); return;
  }
  const [row] = await db.insert(warningsTable).values({
    userId, username, reason, warnedBy, warnedByName, guildId,
  }).returning();
  res.status(201).json(row);
});

// DELETE /warnings/clear/:userId
router.delete("/warnings/clear/:userId", botAuth, async (req, res): Promise<void> => {
  const rows = await db.delete(warningsTable)
    .where(eq(warningsTable.userId, req.params.userId))
    .returning();
  res.json({ success: true, cleared: rows.length });
});

export default router;
