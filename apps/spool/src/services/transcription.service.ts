import fs from 'node:fs';
import path from 'node:path';
import { TranscriptionResponse } from '../types';
import { config } from '../config';

export class TranscriptionService {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey?: string;

  constructor() {
    const inferenceConfig = config.inference;
    if (!inferenceConfig) {
      throw new Error('Inference configuration is missing in spool config');
    }
    this.baseUrl = inferenceConfig.provider_url;
    this.model = inferenceConfig.whisper_model;
    this.apiKey = inferenceConfig.api_key;
  }

  async transcribe(audioPath: string): Promise<string> {
    // Use FormData for multipart/form-data upload
    // In Node.js 18+, FormData is available globally
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(audioPath);
    const blob = new Blob([fileBuffer]);
    formData.append('file', blob, path.basename(audioPath));
    formData.append('model', this.model);

    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    console.log(`[TranscriptionService] Calling ${this.baseUrl} with model ${this.model}`);

    const response = await fetch(`${this.baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transcription failed: ${errorText}`);
    }

    // OpenAI/omlx transcription response format: { text: "..." } or similar
    // The specific model (whisper) usually returns { text: "..." } 
    // We'll allow for a bit of flexibility if needed, but standard is 'text'
    const data = await response.json() as { text: string };
    return data.text;
  }
}
