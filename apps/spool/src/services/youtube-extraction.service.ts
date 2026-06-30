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

  async getCaptions(url: string): Promise<string | null> {
    try {
      const info = await ytdl.getInfo(url);
      // @ts-ignore - ytdl-core types might be missing the playerCaptionsTracklistRenderer
      const captionTracks = info.captions?.playerCaptionsTracklistRenderer?.captionTracks;

      if (!captionTracks || captionTracks.length === 0) {
        return null;
      }

      // Try to find an English track (either manual or auto-generated)
      const englishTrack = captionTracks.find(
        (track: any) => track.languageCode === 'en' || track.languageCode.startsWith('en-')
      );
      
      const track = englishTrack || captionTracks[0];

      if (!track || !track.baseUrl) {
        return null;
      }

      const response = await fetch(track.baseUrl);
      if (!response.ok) {
        return null;
      }

      return await response.text();
    } catch (error) {
      console.error(`[YoutubeExtractionService] Failed to get captions: ${error}`);
      return null;
    }
  }
}
