import { Hono } from 'hono';
import { SpoolRepository } from '../db/repository';
import { SpoolStatus, SpoolSourceType } from '../db/schema';
import { DiscoveryService } from '../services/discovery.service';
import { OrchestrationService } from '../services/orchestration.service';
import { config } from '../config';
import { randomUUID } from 'node:crypto';

export function createSpoolRoutes(deps?: {
  repository?: SpoolRepository;
  discoveryService?: DiscoveryService;
  orchestrationService?: OrchestrationService;
}) {
  const repository = deps?.repository ?? new SpoolRepository();
  const discoveryService = deps?.discoveryService ?? new DiscoveryService(config);
  const orchestrationService = deps?.orchestrationService ?? new OrchestrationService();

  const app = new Hono();

  app.get('/health', (c) => c.json({ status: 'ok' }));

  app.get('/queue', async (c) => {
    const status = c.req.query('status') as SpoolStatus | undefined;
    const items = status ? await repository.getItemsByStatus(status) : await repository.getAllItems();
    return c.json(items);
  });

  app.post('/queue/run', async (c) => {
    const digestDate = new Date().toISOString().split('T')[0];
    await discoveryService.runDiscovery(digestDate);
    await orchestrationService.processQueue(digestDate);
    return c.json({ success: true });
  });

  app.post('/queue/:id/retry', async (c) => {
    const id = (c as any).param('id');
    const digestDate = new Date().toISOString().split('T')[0];
    await orchestrationService.retryItem(id, digestDate);
    return c.json({ success: true });
  });

  app.post('/items', async (c) => {
    const { url, sourceType, title } = await c.req.json();
    if (!url) return c.json({ error: 'URL is required' }, 400);

    const digestDate = new Date().toISOString().split('T')[0];
    const source = (sourceType as SpoolSourceType) || (url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube' : 'podcast');

    // Resolve title: explicit > oEmbed for YouTube > hostname fallback
    let itemTitle = title;
    if (!itemTitle) {
      try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
          const oembed = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
          if (oembed.ok) {
            const data = await oembed.json() as any;
            itemTitle = data.title;
          }
        }
        if (!itemTitle) {
          itemTitle = `Link — ${parsed.hostname}`;
        }
      } catch {
        itemTitle = `Link — ${url.slice(0, 60)}`;
      }
    }

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

    // Fire-and-forget the pipeline — n8n gets a quick response, processing runs in background
    orchestrationService.processQueue(digestDate).catch((err) => {
      console.error(`[Spool] Background processing failed for date ${digestDate}:`, err);
    });

    return c.json({ id, status: 'pending' });
  });

  return app;
}

// Backward-compatible default export (lazy) matching existing singleton pattern.
// Uses Proxy so the module can be imported without instantiating services,
// enabling tests to use the factory with DI. Initialization happens on first
// property access (when Hono mounts the routes).
let _routes: ReturnType<typeof createSpoolRoutes>;
export default new Proxy({} as ReturnType<typeof createSpoolRoutes>, {
  get(_, prop) {
    if (!_routes) _routes = createSpoolRoutes();
    return Reflect.get(_routes!, prop, _routes);
  },
});

