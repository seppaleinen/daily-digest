import { getDb } from "./client";
import { spoolItems, SpoolStatus, NewSpoolItem } from "./schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export class SpoolRepository {
  private db = getDb();

  async upsertItem(item: NewSpoolItem) {
    const id = randomUUID(); 
    const now = Date.now();
    
    await this.db.insert(spoolItems)
      .values({
        ...item,
        id,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: spoolItems.sourceUrl,
        set: {
          title: item.title,
          channelName: item.channelName,
          publishedAt: item.publishedAt,
          status: item.status,
          error: item.error,
          digestDate: item.digestDate,
          updatedAt: now,
        },
      });
    return id;
  }

  async updateStatus(id: string, status: SpoolStatus, error?: string) {
    await this.db.update(spoolItems)
      .set({
        status,
        error,
        updatedAt: Date.now(),
      })
      .where(eq(spoolItems.id, id));
  }

  async getItemsByStatus(status: SpoolStatus) {
    return await this.db.select().from(spoolItems).where(eq(spoolItems.status, status));
  }

  async getAllItems() {
    return await this.db.select().from(spoolItems);
  }

  async getItemById(id: string) {
    const result = await this.db.select().from(spoolItems).where(eq(spoolItems.id, id));
    return result[0] || null;
  }

  async getBySourceUrl(url: string) {
    const result = await this.db.select().from(spoolItems).where(eq(spoolItems.sourceUrl, url));
    return result[0] || null;
  }

  async getFailedItems() {
    return await this.db.select().from(spoolItems).where(eq(spoolItems.status, "failed"));
  }
}

