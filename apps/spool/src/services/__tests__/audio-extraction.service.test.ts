import { describe, it, expect, vi, beforeEach } from "vitest";
import { Readable } from "node:stream";

describe("AudioExtractionService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("downloads audio from url and writes to file", async () => {
    const audioContent = Buffer.from("fake-podcast-audio-data");
    const nodeStream = Readable.from([audioContent]);
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: webStream,
    } as unknown as Response);

    const { AudioExtractionService } = await import("../audio-extraction.service");
    const svc = new AudioExtractionService();

    const tmpPath = "/tmp/test-podcast-download.mp3";
    await svc.downloadAudio("https://example.com/podcast/ep1.mp3", tmpPath);

    expect(globalThis.fetch).toHaveBeenCalledWith("https://example.com/podcast/ep1.mp3");

    const fs = await import("node:fs");
    const written = fs.readFileSync(tmpPath);
    expect(written).toEqual(audioContent);
    fs.unlinkSync(tmpPath);
  });

  it("throws on non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as unknown as Response);

    const { AudioExtractionService } = await import("../audio-extraction.service");
    const svc = new AudioExtractionService();

    await expect(
      svc.downloadAudio("https://example.com/missing.mp3", "/tmp/out.mp3"),
    ).rejects.toThrow("Audio download failed: Failed to fetch audio: 404 Not Found");
  });

  it("throws when response has no body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: null,
    } as unknown as Response);

    const { AudioExtractionService } = await import("../audio-extraction.service");
    const svc = new AudioExtractionService();

    await expect(
      svc.downloadAudio("https://example.com/no-body.mp3", "/tmp/out.mp3"),
    ).rejects.toThrow("Audio download failed: No response body for audio download");
  });
});
