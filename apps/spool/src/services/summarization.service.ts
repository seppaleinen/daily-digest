import { SummarizationResponse } from '../types';
import { config } from '../config';

export class SummarizationService {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey?: string;

  constructor() {
    const inferenceConfig = config.inference;
    if (!inferenceConfig) {
      throw new Error('Inference configuration is missing in spool config');
    }
    this.baseUrl = inferenceConfig.provider_url;
    this.model = inferenceConfig.summarization_model;
    this.apiKey = inferenceConfig.api_key;
  }

  async summarize(text: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes text into clean, semantic HTML. Do not include markdown code blocks (like ```html). Only return the raw HTML content.',
          },
          {
            role: 'user',
            content: `Summarize the following text into HTML format:\n\n${text}`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Summarization failed: ${errorText}`);
    }

    // OpenAI/omlx transcription response format: { text: "..." } or similar
    // The specific model (whisper) usually returns { text: "..." } 
    // We'll allow for a bit of flexibility if needed, but standard is 'text'
    const data = await response.json() as {
      choices: { message: { content: string } }[];
    };

    let content = data.choices[0].message.content;

    // Basic cleanup in case the LLM includes markdown code blocks
    content = content.replace(/^```html\n?/i, '').replace(/```$/i, '').trim();

    return content;
  }
}
