import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const warningsTable = pgTable("warnings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
  reason: text("reason").notNull(),
  warnedBy: text("warned_by").notNull(),
  warnedByName: text("warned_by_name").notNull(),
  guildId: text("guild_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Warning = typeof warningsTable.$inferSelect;
