import { test } from '@japa/runner'
import { PendingEventsWorker } from '#workers/pending_events_worker'
import PollPendingEventsJob from '#jobs/poll_pending_events_job'
import { shouldSchedulePolling } from '#start/scheduler'

test.group('PendingEventsWorker', () => {
  test('delegates to the event processor', async ({ assert }) => {
    let calls = 0

    const eventProcessor = {
      process: async () => {
        calls += 1
      },
    }

    const workerHealthRepository = {
      recordRun: async () => {},
    }

    await new PendingEventsWorker(eventProcessor as never, workerHealthRepository as never).handle()

    assert.equal(calls, 1)
  })
})

test.group('PollPendingEventsJob', () => {
  test('delegates execution to the worker', async ({ assert }) => {
    let calls = 0

    const worker = {
      handle: async () => {
        calls += 1
      },
    }

    await new PollPendingEventsJob(worker as never).execute()

    assert.equal(calls, 1)
  })

  test('uses the pending events queue without job-level retries', async ({ assert }) => {
    assert.equal(PollPendingEventsJob.options.queue, 'pending_events')
    assert.notProperty(PollPendingEventsJob.options, 'maxRetries')
  })
})

test.group('polling scheduler', () => {
  test('does not schedule polling jobs while running tests', async ({ assert }) => {
    assert.isFalse(shouldSchedulePolling('test'))
    assert.isTrue(shouldSchedulePolling('development'))
    assert.isTrue(shouldSchedulePolling('production'))
  })
})
