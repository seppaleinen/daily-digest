import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export type SpoolSourceType = "youtube" | "podcast";
export type SpoolStatus = "pending" | "transcribing" | "summarizing" | "done" | "failed";

export const spoolItems = sqliteTable("spool_items", {
  id: text("id").primaryKey(),
  sourceType: text("source_type").$type<SpoolSourceType>().notNull(),
  sourceUrl: text("source_url").unique().notNull(),
  channelName: text("channel_name"),
  title: text("title").notNull(),
  publishedAt: integer("published_at").notNull(),
  status: text("status").$type<SpoolStatus>().notNull().default("pending"),
  error: text("error"),
  digestDate: text("digest_date").notNull(), // YYYY-MM-DD
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export type SpoolItem = typeof spoolItems.$inferSelect;
export type NewSpoolItem = Omit<SpoolItem, "id" | "createdAt" | "updatedAt">;
