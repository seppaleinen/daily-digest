import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { SOURCE } from "@daily-digest/shared";

export const digestItems = sqliteTable("digest_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD format
  category: text("category").notNull().default("general"),
  source: text("source").notNull().$type<"email" | "podcast" | "youtube">(),
  title: text("title").notNull(),
  html: text("html").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`CURRENT_TIMESTAMP`
  ).notNull(),
}, (table) => ({
  unq_date_category: (table) => {
    return sql`unique(${table.date}, ${table.category})`;
  }
}));

