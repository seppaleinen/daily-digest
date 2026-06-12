import { z } from "zod";
import fs from "node:fs";
import yaml from "yaml";

export const AppConfigSchema = z.object({
  youtube: z.object({
    api_key: z.string(),
    channels: z.array(z.string()),
  }).optional(),
  podcasts: z.object({
    feeds: z.array(z.string()),
  }).optional(),
  inference: z.object({
    provider_url: z.string().url(),
    whisper_model: z.string(),
    summarization_model: z.string(),
    api_key: z.string().optional(),
  }).optional(),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadConfig(): AppConfig {
  const configPath = process.env.SPOOL_CONFIG_PATH;
  let config = {} as AppConfig;

  // 1. Load from YAML if path is provided
  if (configPath && fs.existsSync(configPath)) {
    try {
      const file = fs.readFileSync(configPath, "utf-8");
      const parsed = yaml.parse(file);
      config = AppConfigSchema.parse(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid configuration file: ${error.message}`);
      }
      throw new Error(`Failed to load configuration from ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 2. Merge with Environment Variables (Overrides YAML and fills gaps)
  const envInference = {
    provider_url: process.env.INFERENCE_PROVIDER_URL,
    whisper_model: process.env.WHISPER_MODEL,
    summarization_model: process.env.SUMMARIZATION_MODEL,
    api_key: process.env.INFERENCE_API_KEY,
  };

  // Only try to merge if at least one inference env var is set
  if (envInference.provider_url || envInference.whisper_model || envInference.summarization_model || envInference.api_key) {
    const inference = {
      provider_url: envInference.provider_url || config.inference?.provider_url,
      whisper_model: envInference.whisper_model || config.inference?.whisper_model,
      summarization_model: envInference.summarization_model || config.inference?.summarization_model,
      api_key: envInference.api_key || config.inference?.api_key,
    };

    // Validate the merged inference object
    try {
      const validatedInference = AppConfigSchema.shape.inference.parse(inference);
      config = {
        ...config,
        inference: validatedInference,
      };
    } catch (e) {
      // If the env vars are partially set but invalid, we log a warning or throw
      // For now, let's just log it to avoid breaking local dev
      console.warn("Warning: Inference configuration from environment variables is incomplete or invalid.");
    }
  }

  return config;
}

export const config = loadConfig();

