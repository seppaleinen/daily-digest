import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export class MediaExtractionService {
  async extractAudio(url: string, outputPath: string): Promise<void> {
    try {
      // --force-overwrites to overwrite existing files, -x to extract audio, --audio-format mp3
      await execAsync(`yt-dlp --force-overwrites -x --audio-format mp3 -o "${outputPath}" "${url}"`);
    } catch (error) {
      throw new Error(`Media extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
