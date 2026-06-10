import fs from 'node:fs';
import path from 'node:path';
import { TranscriptionResponse } from '../types';

export class TranscriptionService {
  private readonly whisperUrl: string;

  constructor() {
    this.whisperUrl = process.env.WHISPER_URL || '';
    if (!this.whisperUrl) {
      throw new Error('WHISPER_URL is not defined');
    }
  }

  async transcribe(audioPath: string): Promise<string> {
    // Use FormData for multipart/form-data upload
    // In Node.js 18+, FormData is available globally
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(audioPath);
    const blob = new Blob([fileBuffer]);
    formData.append('file', blob, path.basename(audioPath));

    const response = await fetch(this.whisperUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transcription failed: ${errorText}`);
    }

    const data = await response.json() as TranscriptionResponse;
    return data.transcript;
  }
}
