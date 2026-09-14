import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, adminsTable } from "@workspace/db";

const router: IRouter = Router();

function botAuth(req: any, res: any, next: any) {
  const secret = process.env.BOT_SECRET;
  if (!secret || req.headers["x-bot-secret"] !== secret) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  next();
}

// GET /api/admins/check/:id — ¿está este usuario autorizado?
router.get("/admins/check/:id", botAuth, async (req, res): Promise<void> => {
  const [row] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.discordId, req.params.id));
  res.json({ authorized: !!row });
});

// GET /api/admins — lista todos los admins
router.get("/admins", botAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(adminsTable);
  res.json(rows);
});

// POST /api/admins/add
router.post("/admins/add", botAuth, async (req, res): Promise<void> => {
  const { discordId, discordName, addedBy, addedByName } = req.body as {
    discordId: string;
    discordName: string;
    addedBy: string;
    addedByName: string;
  };

  if (!discordId || !discordName) {
    res.status(400).json({ error: "discordId y discordName requeridos" });
    return;
  }

  const [existing] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.discordId, discordId));

  if (existing) {
    res.status(409).json({ error: "Ya es admin" });
    return;
  }

  const [row] = await db
    .insert(adminsTable)
    .values({ discordId, discordName, addedBy, addedByName })
    .returning();

  res.status(201).json(row);
});

// POST /api/admins/remove
router.post("/admins/remove", botAuth, async (req, res): Promise<void> => {
  const { discordId } = req.body as { discordId: string };
  if (!discordId) {
    res.status(400).json({ error: "discordId requerido" });
    return;
  }

  const [row] = await db
    .delete(adminsTable)
    .where(eq(adminsTable.discordId, discordId))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Admin no encontrado" });
    return;
  }
  res.json({ success: true });
});

export default router;
