import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { EventWorkflow } from '#application/events/event_workflow'
import type { ProcessingEvent } from '#domain/events/event'

function createProcessingEvent(): ProcessingEvent {
  return {
    id: 1,
    status: 'processing',
    eventTypeId: 1,
    sourceApp: 'sojadispro',
    sourceEntityType: 'worksheet',
    sourceEntityId: 95,
    payload: {},
    createdAt: DateTime.utc(),
    processingStartedAt: DateTime.utc(),
    appliedRuleVersionId: null,
  }
}

test.group('EventWorkflow', () => {
  test('executes the event with the rule version resolved by the resolver', async ({ assert }) => {
    const event = createProcessingEvent()
    let executedWith: unknown

    const ruleResolver = { resolve: async () => ({ ruleVersionId: 42 }) }
    const eventExecutor = {
      execute: async (executedEvent: unknown) => {
        executedWith = executedEvent
      },
    }

    await new EventWorkflow(ruleResolver as never, eventExecutor as never).run(event)

    assert.deepEqual(executedWith, { ...event, appliedRuleVersionId: 42 })
  })

  test('never calls the executor when resolution fails', async ({ assert }) => {
    const event = createProcessingEvent()
    let executorCalls = 0

    const ruleResolver = {
      resolve: async () => {
        throw new Error('No rule matches')
      },
    }
    const eventExecutor = {
      execute: async () => {
        executorCalls += 1
      },
    }

    await assert.rejects(
      () => new EventWorkflow(ruleResolver as never, eventExecutor as never).run(event),
      /No rule matches/
    )

    assert.equal(executorCalls, 0)
  })
})
