import { SpoolRepository } from "../db/repository";
import { AppConfig } from "../config";
import { SpoolSourceType } from "../db/schema";
import { randomUUID } from "node:crypto";

export class DiscoveryService {
  private repository = new SpoolRepository();

  constructor(private config: AppConfig) {}

  async discoverYoutube(): Promise<{ sourceUrl: string; title: string; channelName: string; publishedAt: number; sourceType: SpoolSourceType }[]> {
    if (!this.config.youtube) return [];
    const { api_key, channels } = this.config.youtube;
    const results: { sourceUrl: string; title: string; channelName: string; publishedAt: number; sourceType: SpoolSourceType }[] = [];

    for (const channelId of channels) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=10&type=video&key=${api_key}`
        );

        if (!response.ok) {
          console.error(`Failed to fetch YouTube videos for channel ${channelId}: ${response.statusText}`);
          continue;
        }

        const data = await response.json() as any;
        for (const item of data.items || []) {
          results.push({
            sourceUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            title: item.snippet.title,
            channelName: item.snippet.channelTitle,
            publishedAt: new Date(item.snippet.publishedAt).getTime(),
            sourceType: "youtube",
          });
        }
      } catch (error) {
        console.error(`Error fetching YouTube videos for channel ${channelId}: ${error}`);
      }
    }
    return results;
  }

  async discoverPodcasts(): Promise<{ sourceUrl: string; title: string; channelName: string; publishedAt: number; sourceType: SpoolSourceType }[]> {
    if (!this.config.podcasts) return [];
    const { feeds } = this.config.podcasts;
    const results: { sourceUrl: string; title: string; channelName: string; publishedAt: number; sourceType: SpoolSourceType }[] = [];

    for (const feedUrl of feeds) {
      try {
        const response = await fetch(feedUrl);
        if (!response.ok) continue;
        const xml = await response.text();
        
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const titleRegex = /<title>([\s\S]*?)<\/title>/g;
        const linkRegex = /<link>([\s\S]*?)<\/link>/g;
        const pubDateRegex = /<pubDate>([\s\S]*?)<\/pubDate>/g;

        let match;
        while ((match = itemRegex.exec(xml)) !== null) {
          const itemContent = match[1];
          const titleMatch = titleRegex.exec(itemContent);
          const linkMatch = linkRegex.exec(itemContent);
          const pubDateMatch = pubDateRegex.exec(itemContent);

          if (titleMatch && linkMatch && pubDateMatch) {
            results.push({
              sourceUrl: linkMatch[1].trim(),
              title: titleMatch[1].trim(),
              channelName: "", 
              publishedAt: new Date(pubDateMatch[1].trim()).getTime(),
              sourceType: "podcast",
            });
          }
        }
      } catch (error) {
        console.error(`Failed to fetch podcast feed ${feedUrl}: ${error}`);
      }
    }
    return results;
  }

  async runDiscovery(digestDate: string) {
    const [ytItems, podcastItems] = await Promise.all([
      this.discoverYoutube(),
      this.discoverPodcasts(),
    ]);

    const allItems = [...ytItems, ...podcastItems];

    for (const item of allItems) {
      const existing = await this.repository.getBySourceUrl(item.sourceUrl);
      if (!existing) {
        await this.repository.upsertItem({
          sourceType: item.sourceType,
          sourceUrl: item.sourceUrl,
          channelName: item.channelName,
          title: item.title,
          publishedAt: item.publishedAt,
          status: "pending",
          digestDate,
        });
      }
    }
  }
}
