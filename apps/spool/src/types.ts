export interface TranscriptionResponse {
  transcript: string;
}

export interface SummarizationResponse {
  html: string;
}

export interface DigestResponse {
  success: boolean;
  error?: string;
}
