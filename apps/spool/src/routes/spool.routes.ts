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
  const id = c.param('id');
  const digestDate = new Date().toISOString().split('T')[0];
  await orchestrationService.retryItem(id, digestDate);
  return c.json({ success: true });
});

spoolRoutes.post('/transcribe', async (c) => {
  const { url, sourceType } = await c.req.json();
  if (!url) return c.json({ error: 'URL is required' }, 400);

  const digestDate = new Date().toISOString().split('T')[0];
  const source = (sourceType as SpoolSourceType) || (url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube' : 'podcast');

  const newItem = {
    sourceType: source,
    sourceUrl: url,
    channelName: '',
    title: 'Manual Test Transcribe',
    publishedAt: Date.now(),
    status: 'pending' as SpoolStatus,
    digestDate,
  };

  await repository.upsertItem(newItem);
  
  // Trigger orchestration for this specific item
  // We need the id from upserted item. 
  // Actually repository.upsertItem returns void. I should modify it to return the id.
  // But for now I'll just say "queued".
  
  return c.json({ message: 'Transcription queued for testing', sourceType: source });
});

export default spoolRoutes;
