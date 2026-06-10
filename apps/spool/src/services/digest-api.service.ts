import { DigestResponse } from '../types';

export interface DigestPayload {
  source: string;
  title: string;
  html: string;
}

export class DigestApiService {
  private readonly digestApiUrl: string;

  constructor() {
    this.digestApiUrl = process.env.DIGEST_API_URL || '';
    if (!this.digestApiUrl) {
      throw new Error('DIGEST_API_URL is not defined');
    }
  }

  async pushDigestItem(date: string, payload: DigestPayload): Promise<void> {
    const response = await fetch(`${this.digestApiUrl}/digest/${date}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to push digest item: ${errorText}`);
    }
  }
}
