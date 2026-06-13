import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("loadConfig", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spool-config-test-"));
    // Start with clean env vars
    delete process.env.SPOOL_CONFIG_PATH;
    delete process.env.INFERENCE_PROVIDER_URL;
    delete process.env.WHISPER_MODEL;
    delete process.env.SUMMARIZATION_MODEL;
    delete process.env.INFERENCE_API_KEY;
    vi.resetModules();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns empty config when no env vars or config file", async () => {
    const { loadConfig } = await import("../index");
    const config = loadConfig();
    expect(config).toEqual({});
  });

  it("loads config from YAML file", async () => {
    const yamlPath = path.join(tempDir, "config.yaml");
    fs.writeFileSync(yamlPath, [
      "youtube:",
      "  api_key: test-key",
      "  channels:",
      "    - UC123",
      "podcasts:",
      "  feeds:",
      "    - https://example.com/feed.xml",
      "inference:",
      "  provider_url: http://localhost:11434",
      "  whisper_model: base",
      "  summarization_model: llama3",
    ].join("\n"), "utf-8");

    process.env.SPOOL_CONFIG_PATH = yamlPath;
    const { loadConfig } = await import("../index");
    const config = loadConfig();

    expect(config.youtube?.api_key).toBe("test-key");
    expect(config.youtube?.channels).toEqual(["UC123"]);
    expect(config.podcasts?.feeds).toEqual(["https://example.com/feed.xml"]);
    expect(config.inference?.provider_url).toBe("http://localhost:11434");
    expect(config.inference?.whisper_model).toBe("base");
    expect(config.inference?.summarization_model).toBe("llama3");
  });

  it("merges env vars over YAML config", async () => {
    const yamlPath = path.join(tempDir, "config.yaml");
    fs.writeFileSync(yamlPath, [
      "inference:",
      "  provider_url: http://localhost:11434",
      "  whisper_model: base",
      "  summarization_model: llama3",
    ].join("\n"), "utf-8");

    process.env.SPOOL_CONFIG_PATH = yamlPath;
    process.env.INFERENCE_PROVIDER_URL = "http://override:11434";
    const { loadConfig } = await import("../index");
    const config = loadConfig();

    expect(config.inference?.provider_url).toBe("http://override:11434");
    expect(config.inference?.whisper_model).toBe("base");
    expect(config.inference?.summarization_model).toBe("llama3");
  });

  it("loads inference from env vars without YAML file", async () => {
    process.env.INFERENCE_PROVIDER_URL = "http://localhost:11434";
    process.env.WHISPER_MODEL = "large";
    process.env.SUMMARIZATION_MODEL = "mistral";
    const { loadConfig } = await import("../index");
    const config = loadConfig();

    expect(config.inference?.provider_url).toBe("http://localhost:11434");
    expect(config.inference?.whisper_model).toBe("large");
    expect(config.inference?.summarization_model).toBe("mistral");
  });

  it("throws on invalid YAML config (at import time)", async () => {
    const yamlPath = path.join(tempDir, "config.yaml");
    fs.writeFileSync(yamlPath, [
      "inference:",
      "  provider_url: not-a-url",
      "  whisper_model: base",
      "  summarization_model: llama3",
    ].join("\n"), "utf-8");

    process.env.SPOOL_CONFIG_PATH = yamlPath;
    // Module-level loadConfig() runs at import time and throws on invalid YAML
    await expect(import("../index")).rejects.toThrow("Invalid configuration file");
  });

  it("gracefully handles missing config file path", async () => {
    process.env.SPOOL_CONFIG_PATH = "/nonexistent/path.yaml";
    const { loadConfig } = await import("../index");
    const config = loadConfig();
    expect(config).toEqual({});
  });
});
