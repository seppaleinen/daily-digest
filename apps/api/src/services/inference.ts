const DEFAULT_SUMMARIZATION_PROMPT = `You are a helpful assistant that summarizes text into clean, semantic HTML. Do not include markdown code blocks (like \`\`\`html). Only return the raw HTML content.

Summarize the following text into a concise, structured HTML format.
Use semantic tags like <h3>, <p>, and <ul>/<li>.
DO NOT just repeat the text. If the text is already short, provide a very brief summary.

Text to summarize:
`;

export class InferenceService {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey?: string;

  constructor() {
    this.baseUrl = process.env.INFERENCE_PROVIDER_URL || "";
    this.model = process.env.SUMMARIZATION_MODEL || "";
    this.apiKey = process.env.INFERENCE_API_KEY;

    if (!this.baseUrl) {
      console.warn("INFERENCE_PROVIDER_URL not set — summarization will be unavailable");
    }
  }

  get isAvailable(): boolean {
    return !!this.baseUrl && !!this.model;
  }

  async summarize(text: string, customPrompt?: string): Promise<string> {
    if (!this.isAvailable) {
      throw new Error("Inference service not configured (INFERENCE_PROVIDER_URL or SUMMARIZATION_MODEL missing)");
    }

    const systemPrompt = customPrompt || DEFAULT_SUMMARIZATION_PROMPT;

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Summarization failed: ${errorText}`);
    }

    const data = await response.json() as {
      choices: { message: { content: string } }[];
    };

    let content = data.choices[0].message.content;

    // Clean up any markdown code blocks the LLM might include
    content = content.replace(/^```html\n?/i, "").replace(/```$/i, "").trim();

    return content;
  }
}
