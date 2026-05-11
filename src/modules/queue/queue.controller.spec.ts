import type { QueueService } from './queue.service';
import { QueueController } from './queue.controller';

describe('QueueController', () => {
  it('returns queue metrics from the service', async () => {
    const metrics = {
      waiting: 1,
      active: 0,
      completed: 2,
      failed: 0,
      delayed: 1,
      dlq: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      },
    };
    const queueService = {
      getMetrics: jest.fn().mockResolvedValue(metrics),
    };
    const controller = new QueueController(
      queueService as unknown as QueueService,
    );

    await expect(controller.getMetrics()).resolves.toBe(metrics);
    expect(queueService.getMetrics).toHaveBeenCalled();
  });
});
