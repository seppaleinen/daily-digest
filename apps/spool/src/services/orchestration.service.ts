import fs from "node:fs";
import path from "node:path";
import { SpoolRepository } from "../db/repository";
import { SpoolStatus } from "../db/schema";
import { YoutubeExtractionService } from "./youtube-extraction.service";
import { AudioExtractionService } from "./audio-extraction.service";
import { TranscriptionService } from "./transcription.service";
import { SummarizationService } from "./summarization.service";
import { DigestApiService } from "./digest-api.service";

export interface OrchestrationOptions {
  repository?: SpoolRepository;
  youtubeExtraction?: YoutubeExtractionService;
  audioExtraction?: AudioExtractionService;
  transcription?: TranscriptionService;
  summarization?: SummarizationService;
  digestApi?: DigestApiService;
  tempDir?: string;
}

export class OrchestrationService {
  private repository: SpoolRepository;
  private youtubeExtraction: YoutubeExtractionService;
  private audioExtraction: AudioExtractionService;
  private transcription: TranscriptionService;
  private summarization: SummarizationService;
  private digestApi: DigestApiService;
  private tempDir: string;

  constructor(options?: OrchestrationOptions) {
    this.repository = options?.repository ?? new SpoolRepository();
    this.youtubeExtraction = options?.youtubeExtraction ?? new YoutubeExtractionService();
    this.audioExtraction = options?.audioExtraction ?? new AudioExtractionService();
    this.transcription = options?.transcription ?? new TranscriptionService();
    this.summarization = options?.summarization ?? new SummarizationService();
    this.digestApi = options?.digestApi ?? new DigestApiService();
    this.tempDir = options?.tempDir ?? "/tmp/spool";

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
      
      // Step 1: Extraction (source-type dependent)
      await this.repository.updateStatus(item.id, "transcribing");
      let transcript: string;

      if (item.sourceType === "youtube") {
        console.log(`[Orchestration] Step 1/3: Checking for YouTube captions...`);
        const captions = await this.youtubeExtraction.getCaptions(item.sourceUrl);
        
        if (captions) {
          console.log(`[Orchestration] Step 2/3: Using captions...`);
          transcript = await this.transcription.transcribeText(captions);
        } else {
          console.log(`[Orchestration] No captions found. Proceeding with audio extraction...`);
          await this.youtubeExtraction.extractAudio(item.sourceUrl, audioPath);
          console.log(`[Orchestration] Step 2/3: Transcribing audio...`);
          transcript = await this.transcription.transcribe(audioPath);
        }
      } else {
        console.log(`[Orchestration] Step 1/3: Downloading audio...`);
        await this.audioExtraction.downloadAudio(item.sourceUrl, audioPath);
        console.log(`[Orchestration] Step 2/3: Transcribing audio...`);
        transcript = await this.transcription.transcribe(audioPath);
      }

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
