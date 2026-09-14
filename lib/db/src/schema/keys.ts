import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const keysTable = pgTable("keys", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  productId: text("product_id").notNull().default("legacy"), // loader autorizado para esta key
  type: text("type").notNull(), // "permanent" | "timed"
  durationMinutes: integer("duration_minutes"),     // duración total en minutos (timed)
  expiresAt: timestamp("expires_at", { withTimezone: true }), // se calcula al activar
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: text("created_by"),
  createdByName: text("created_by_name"),
  assignedTo: text("assigned_to"),   // nombre del usuario al que se asigna la key
  isActive: boolean("is_active").notNull().default(true),
  hwid: text("hwid"),         // se guarda en la primera activación; null = libre
  ipAddress: text("ip_address"),      // IP del último uso
  platform: text("platform"),         // Desktop / Mobile / Console
  deviceModel: text("device_model"),  // modelo del dispositivo/OS
  robloxVersion: text("roblox_version"), // versión del cliente Roblox
});

export const insertKeySchema = createInsertSchema(keysTable).omit({
  id: true,
  createdAt: true,
});
export type InsertKey = z.infer<typeof insertKeySchema>;
export type Key = typeof keysTable.$inferSelect;
