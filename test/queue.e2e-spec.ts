import './helpers/prisma.mock';
import {
  TestAppContext,
  createTestApp,
  requestApp,
} from './helpers/create-test-app';

describe('Queue flow (e2e)', () => {
  let context: TestAppContext;

  beforeEach(async () => {
    context = await createTestApp();
  });

  afterEach(async () => {
    await context.app.close();
  });

  it('returns queue metrics', async () => {
    await requestApp(context)
      .get('/queue/metrics')
      .expect(200)
      .expect({
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
      });

    expect(context.mocks.queueService.getMetrics).toHaveBeenCalled();
  });
});
