import fs from "node:fs";
import path from "node:path";
import { SpoolRepository } from "../db/repository";
import { SpoolStatus } from "../db/schema";
import { MediaExtractionService } from "./media-extraction.service";
import { TranscriptionService } from "./transcription.service";
import { SummarizationService } from "./summarization.service";
import { DigestApiService } from "./digest-api.service";

export class OrchestrationService {
  private repository = new SpoolRepository();
  private mediaExtraction = new MediaExtractionService();
  private transcription = new TranscriptionService();
  private summarization = new SummarizationService();
  private digestApi = new DigestApiService();
  private tempDir = "/tmp/spool";

  constructor() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async processQueue(digestDate: string) {
    const pendingItems = await this.repository.getItemsByStatus("pending");
    
    for (const item of pendingItems) {
      await this.processItem(item, digestDate);
    }
  }

  async processItem(item: any, digestDate: string) {
    const audioPath = path.join(this.tempDir, `${item.id}.mp3`);
    
    try {
      console.log(`[Orchestration] Starting process for item: ${item.id} (${item.title})`);
      
      // Step 1: Extraction
      console.log(`[Orchestration] Step 1/3: Extracting audio...`);
      await this.repository.updateStatus(item.id, "transcribing");
      await this.mediaExtraction.extractAudio(item.sourceUrl, audioPath);

      // Step 2: Transcription
      console.log(`[Orchestration] Step 2/3: Transcribing...`);
      const transcript = await this.transcription.transcribe(audioPath);

      // Step 3: Summarization
      console.log(`[Orchestration] Step 3/3: Summarizing...`);
      await this.repository.updateStatus(item.id, "summarizing");
      const summary = await this.summarization.summarize(transcript);
      console.log(`[Orchestration] Summary length: ${summary.length} characters`);

      console.log(`[Orchestration] Pushing to Digest API...`);

      // Normalize source URL: ensure it has a protocol so the reader resolves it correctly
      const normalizedUrl = item.sourceUrl?.startsWith("http://") || item.sourceUrl?.startsWith("https://")
        ? item.sourceUrl
        : `https://${item.sourceUrl}`;

      await this.digestApi.pushDigestItem(digestDate, {
        source: item.sourceType,
        title: item.title,
        html: summary,
        sourceUrl: normalizedUrl,
      });

      console.log(`[Orchestration] Successfully completed item: ${item.id}`);
      await this.repository.updateStatus(item.id, "done");
    } catch (error) {
      console.error(`[Orchestration] Error processing item ${item.id}: ${error}`);
      await this.repository.updateStatus(item.id, "failed", error instanceof Error ? error.message : String(error));
    } finally {
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    }
  }

  async retryItem(id: string, digestDate: string) {
    const item = await this.repository.getItemById(id);
    if (!item) throw new Error("Item not found");
    if (item.status === "done") return;
    
    await this.repository.updateStatus(id, "pending");
    await this.processItem(item, digestDate);
  }
}
