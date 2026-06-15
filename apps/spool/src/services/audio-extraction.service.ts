import fs from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export class AudioExtractionService {
  async downloadAudio(url: string, outputPath: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch audio: ${response.status} ${response.statusText}`,
        );
      }

      if (!response.body) {
        throw new Error("No response body for audio download");
      }

      const readStream = Readable.from(response.body as unknown as AsyncIterable<Uint8Array>);
      const writeStream = fs.createWriteStream(outputPath);
      await pipeline(readStream, writeStream);
    } catch (error) {
      throw new Error(
        `Audio download failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
