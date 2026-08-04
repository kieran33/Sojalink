import { test } from '@japa/runner'
import redis from '@adonisjs/redis/services/main'
import { WorkerHealthRepository } from '#persistence/events/worker_health_repository'

test.group('WorkerHealthRepository', (group) => {
  group.each.setup(async () => {
    await redis.del('worker_pending_event:last_heartbeat')
    await redis.del('worker_pending_event:recent_durations')
  })

  test('reports unhealthy when no run has ever been recorded', async ({ assert }) => {
    const repository = new WorkerHealthRepository()

    const stats = await repository.getStats()

    assert.isFalse(stats.isRunning)
    assert.isNull(stats.lastRunAt)
  })

  test('reports healthy after recording a run', async ({ assert }) => {
    const repository = new WorkerHealthRepository()

    await repository.recordRun(42)
    const stats = await repository.getStats()

    assert.isTrue(stats.isRunning)
    assert.equal(stats.totalRunsCount, 1)
    assert.isNotNull(stats.lastRunAtFormatted)
  })
})
