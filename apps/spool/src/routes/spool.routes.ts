import { Hono } from 'hono';
import { SpoolRepository } from '../db/repository';
import { SpoolStatus, SpoolSourceType } from '../db/schema';
import { DiscoveryService } from '../services/discovery.service';
import { OrchestrationService } from '../services/orchestration.service';
import { config } from '../config';
import { randomUUID } from 'node:crypto';

const spoolRoutes = new Hono();
const repository = new SpoolRepository();
const discoveryService = new DiscoveryService(config);
const orchestrationService = new OrchestrationService();

spoolRoutes.get('/health', (c) => c.json({ status: 'ok' }));

spoolRoutes.get('/queue', async (c) => {
  const status = c.req.query('status') as SpoolStatus | undefined;
  const items = status ? await repository.getItemsByStatus(status) : await repository.getAllItems();
  return c.json(items);
});

spoolRoutes.post('/queue/run', async (c) => {
  const digestDate = new Date().toISOString().split('T')[0];
  await discoveryService.runDiscovery(digestDate);
  await orchestrationService.processQueue(digestDate);
  return c.json({ success: true });
});

spoolRoutes.post('/queue/:id/retry', async (c) => {
  const id = (c as any).param('id');
  const digestDate = new Date().toISOString().split('T')[0];
  await orchestrationService.retryItem(id, digestDate);
  return c.json({ success: true });
});

spoolRoutes.post('/transcribe', async (c) => {
    const { url, sourceType, title } = await c.req.json();
    if (!url) return c.json({ error: 'URL is required' }, 400);

    const digestDate = new Date().toISOString().split('T')[0];
    const source = (sourceType as SpoolSourceType) || (url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube' : 'podcast');

    // Derive a readable title from the URL if none provided
    const itemTitle = title || (() => {
      try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
          const vid = parsed.searchParams.get('v') || parsed.pathname.split('/').pop() || '';
          return `YouTube — ${vid}`;
        }
        return `Link — ${parsed.hostname}`;
      } catch {
        return `Link — ${url.slice(0, 60)}`;
      }
    })();

    const newItem = {
      sourceType: source,
      sourceUrl: url,
      channelName: '',
      title: itemTitle,
      publishedAt: Date.now(),
      status: 'pending' as SpoolStatus,
      digestDate,
      error: null as string | null,
    };

    const id = await repository.upsertItem(newItem);
    
    await orchestrationService.processQueue(digestDate);
    
    return c.json({ id, message: 'Transcription queued for testing', sourceType: source });
  });

export default spoolRoutes;

