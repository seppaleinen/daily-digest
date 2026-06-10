import { SpoolRepository } from "../apps/spool/src/db/repository";
import { SpoolStatus } from "../apps/spool/src/db/schema";
import * as path from "node:path";
import * as fs from "node:fs";

async function main() {
  console.log("Starting verification...");

  // Ensure data directory exists
  const dataDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  const repo = new SpoolRepository();

  const testItem = {
    sourceType: "youtube" as const,
    sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    channelName: "Rick Astley",
    title: "Never Gonna Give You Up",
    publishedAt: Date.now(),
    status: "pending" as SpoolStatus,
    digestDate: "2026-06-10",
  };

  console.log("1. Upserting item...");
  await repo.upsertItem(testItem);

  const items = await repo.getItemsByStatus("pending");
  if (items.length === 0) {
    throw new Error("No items found with status 'pending'");
  }
  const item = items[0];
  console.log("Item found:", item.title);

  console.log("2. Updating status to transcribing...");
  await repo.updateStatus(item.id, "transcribing");

  const itemUpdated = await repo.getItemById(item.id);
  if (!itemUpdated || itemUpdated.status !== "transcribing") {
    throw new Error(`Expected status 'transcribing', got ${itemUpdated?.status}`);
  }
  console.log("Status updated successfully.");

  console.log("3. Updating status to failed with error...");
  await repo.updateStatus(item.id, "failed", "Test error");

  const failedItems = await repo.getFailedItems();
  if (failedItems.length === 0 || failedItems[0].id !== item.id) {
    throw new Error("Failed item not found in failed items list");
  }
  console.log("Failed items fetched successfully.");

  console.log("Verification successful!");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
