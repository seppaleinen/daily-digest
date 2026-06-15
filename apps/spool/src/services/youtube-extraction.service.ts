import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import ytdl from "@distube/ytdl-core";

export class YoutubeExtractionService {
  async extractAudio(url: string, outputPath: string): Promise<void> {
    try {
      const info = await ytdl.getInfo(url);
      const format = ytdl.chooseFormat(info.formats, {
        filter: "audioonly",
        quality: "highestaudio",
      });
      if (!format) {
        throw new Error("No audio format found for YouTube video");
      }

      const readStream = ytdl.downloadFromInfo(info, { format });
      const writeStream = fs.createWriteStream(outputPath);
      await pipeline(readStream, writeStream);
    } catch (error) {
      throw new Error(
        `YouTube extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
