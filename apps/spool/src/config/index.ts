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
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadConfig(): AppConfig {
  const configPath = process.env.SPOOL_CONFIG_PATH;
  if (!configPath) {
    return {};
  }

  try {
    const file = fs.readFileSync(configPath, "utf-8");
    const parsed = yaml.parse(file);
    return AppConfigSchema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid configuration: ${error.message}`);
    }
    throw new Error(`Failed to load configuration from ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const config = loadConfig();
