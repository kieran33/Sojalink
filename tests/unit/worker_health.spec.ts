import { test } from '@japa/runner'
import { WorkerHealthRepository } from '#persistence/events/worker_health_repository'

test.group('WorkerHealthRepository', () => {
  test('reports unhealthy when no run has ever been recorded', async ({ assert }) => {
    const repository = new WorkerHealthRepository()

    const stats = await repository.getStats()

    assert.isFalse(stats.isHealthy)
    assert.isNull(stats.lastRunAt)
  })

  test('reports healthy after recording a run', async ({ assert }) => {
    const repository = new WorkerHealthRepository()

    await repository.recordRun(42)
    const stats = await repository.getStats()

    assert.isTrue(stats.isHealthy)
    assert.equal(stats.recentRunsCount, 1)
  })
})
