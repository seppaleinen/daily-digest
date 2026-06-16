import { describe, it, expect, vi, beforeEach } from "vitest";
import { Readable } from "node:stream";

vi.mock("@distube/ytdl-core", () => {
  return {
    default: {
      getInfo: vi.fn(),
      chooseFormat: vi.fn(),
      downloadFromInfo: vi.fn(),
    },
  };
});

import ytdl from "@distube/ytdl-core";

const mockYtdl = vi.mocked(ytdl);

describe("YoutubeExtractionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts audio from youtube url and writes to file", async () => {
    const fakeFormat = { itag: 140, mimeType: 'audio/mp4' };
    const fakeInfo = { formats: [fakeFormat] };
    const audioContent = Buffer.from("fake-audio-data");

    (mockYtdl.getInfo as any).mockResolvedValue(fakeInfo as any);
    (mockYtdl.chooseFormat as any).mockReturnValue(fakeFormat as any);
    (mockYtdl.downloadFromInfo as any).mockReturnValue(Readable.from([audioContent]));

    const { YoutubeExtractionService } = await import("../youtube-extraction.service");
    const svc = new YoutubeExtractionService();

    const tmpPath = "/tmp/test-youtube-extract.mp4";
    await svc.extractAudio("https://youtube.com/watch?v=test123", tmpPath);

    expect(mockYtdl.getInfo).toHaveBeenCalledWith("https://youtube.com/watch?v=test123");
    expect(mockYtdl.chooseFormat).toHaveBeenCalledWith(
      [fakeFormat],
      { filter: "audioonly", quality: "highestaudio" },
    );
    expect(mockYtdl.downloadFromInfo).toHaveBeenCalledWith(fakeInfo, { format: fakeFormat });

    const fs = await import("node:fs");
    const written = fs.readFileSync(tmpPath);
    expect(written).toEqual(audioContent);
    fs.unlinkSync(tmpPath);
  });

  it("throws when chooseFormat returns falsy", async () => {
    (mockYtdl.getInfo as any).mockResolvedValue({ formats: [] } as any);
    (mockYtdl.chooseFormat as any).mockReturnValue(undefined as any);

    const { YoutubeExtractionService } = await import("../youtube-extraction.service");
    const svc = new YoutubeExtractionService();

    await expect(
      svc.extractAudio("https://youtube.com/watch?v=test123", "/tmp/out.mp4"),
    ).rejects.toThrow("YouTube extraction failed");
  });

  it("throws when getInfo fails", async () => {
    (mockYtdl.getInfo as any).mockRejectedValue(new Error("Video unavailable"));

    const { YoutubeExtractionService } = await import("../youtube-extraction.service");
    const svc = new YoutubeExtractionService();

    await expect(
      svc.extractAudio("https://youtube.com/watch?v=test123", "/tmp/out.mp4"),
    ).rejects.toThrow("YouTube extraction failed: Video unavailable");
  });
});
