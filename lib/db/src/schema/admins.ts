import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const adminsTable = pgTable("admins", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  discordName: text("discord_name").notNull(),
  addedBy: text("added_by").notNull(),
  addedByName: text("added_by_name").notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Admin = typeof adminsTable.$inferSelect;
