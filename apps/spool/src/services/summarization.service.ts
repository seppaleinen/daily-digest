import { SummarizationResponse } from '../types';

export class SummarizationService {
  private readonly summarizerUrl: string;

  constructor() {
    this.summarizerUrl = process.env.SUMMARIZER_URL || '';
    if (!this.summarizerUrl) {
      throw new Error('SUMMARIZER_URL is not defined');
    }
  }

  async summarize(text: string): Promise<string> {
    const response = await fetch(this.summarizerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Summarization failed: ${errorText}`);
    }

    const data = await response.json() as SummarizationResponse;
    return data.html;
  }
}
