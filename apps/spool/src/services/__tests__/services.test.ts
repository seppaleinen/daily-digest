import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TranscriptionService } from '../transcription.service';
import { SummarizationService } from '../summarization.service';
import { DigestApiService } from '../digest-api.service';
import { MediaExtractionService } from '../media-extraction.service';
import { exec } from 'node:child_process';

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}));

describe('Spool Services', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = {
      ...originalEnv,
      WHISPER_URL: 'http://whisper:3000',
      SUMMARIZER_URL: 'http://summarizer:3000',
      DIGEST_API_URL: 'http://digest-api:3000',
    };

    // Mock global fetch
    global.fetch = vi.fn() as any;
  });

  describe('TranscriptionService', () => {
    it('should transcribe audio successfully', async () => {
      const transcriptionService = new TranscriptionService();
      const mockTranscript = 'this is a test transcript';
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ transcript: mockTranscript }),
      });

      const transcript = await transcriptionService.transcribe('test.mp3');
      expect(transcript).toBe(mockTranscript);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://whisper:3000',
        expect.any(Object)
      );
    });

    it('should throw error when transcription fails', async () => {
      const transcriptionService = new TranscriptionService();
      (global.fetch as any).mockResolvedValue({
        ok: false,
        text: async () => 'error message',
      });

      await expect(transcriptionService.transcribe('test.mp3')).rejects.toThrow('Transcription failed: error message');
    });
  });

  describe('SummarizationService', () => {
    it('should summarize text successfully', async () => {
      const summarizationService = new SummarizationService();
      const mockHtml = '<h1>Summary</h1>';

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ html: mockHtml }),
      });

      const html = await summarizationService.summarize('some text');
      expect(html).toBe(mockHtml);
    });

    it('should throw error when summarization fails', async () => {
      const summarizationService = new SummarizationService();
      (global.fetch as any).mockResolvedValue({
        ok: false,
        text: async () => 'error message',
      });

      await expect(summarizationService.summarize('some text')).rejects.toThrow('Summarization failed: error message');
    });
  });

  describe('DigestApiService', () => {
    it('should push digest item successfully', async () => {
      const digestApiService = new DigestApiService();
      (global.fetch as any).mockResolvedValue({ ok: true });

      await digestApiService.pushDigestItem('2023-01-01', {
        source: 'youtube',
        title: 'Test Video',
        html: '<p>Summary</p>',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://digest-api:3000/digest/2023-01-01/items',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );
    });
  });

  describe('MediaExtractionService', () => {
    it('should extract audio successfully', async () => {
      const extractionService = new MediaExtractionService();
      (exec as unknown as vi.Mock).mockImplementation((cmd, cb) => cb(null, { stdout: '', stderr: '' }));

      await extractionService.extractAudio('http://youtube.com/watch?v=test', 'output.mp3');
      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining('yt-dlp -y -x --audio-format mp3 -o "output.mp3" "http://youtube.com/watch?v=test"'),
        expect.any(Function)
      );
    });

    it('should throw error when extraction fails', async () => {
      const extractionService = new MediaExtractionService();
      (exec as unknown as vi.Mock).mockImplementation((cmd, cb) => cb(new Error('command failed'), { stdout: '', stderr: 'error' }));

      await expect(extractionService.extractAudio('url', 'out.mp3')).rejects.toThrow('Media extraction failed: command failed');
    });
  });
});
