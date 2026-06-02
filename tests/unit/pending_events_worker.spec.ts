import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import SojalinkEventTypeSeeder from '#database/seeders/sojalink_event_type_seeder'
import SojalinkRuleSeeder from '#database/seeders/sojalink_rule_seeder'
import SojalinkRuleVersionSeeder from '#database/seeders/sojalink_rule_version_seeder'
import SojalinkEvent from '#models/sojalink_event'
import { EventRepository } from '#persistence/events/event_repository'
import PollPendingEventsJob from '../../app/jobs/poll_pending_events_job.js'
import { shouldSchedulePolling } from '../../start/scheduler.js'

type EventDependencies = {
  eventTypeId: number
  ruleVersionId: number
}

async function seedEventDependencies(): Promise<EventDependencies> {
  const client = db.connection()

  await new SojalinkEventTypeSeeder(client).run()
  await new SojalinkRuleSeeder(client).run()
  await new SojalinkRuleVersionSeeder(client).run()

  const eventType = await db
    .from('sojalink_event_types')
    .where('code', 'sojadispro.order.created')
    .first()

  const rule = await db
    .from('sojalink_rules')
    .where('code', 'sojadispro-order-to-toki-task')
    .first()

  const ruleVersion = rule
    ? await db.from('sojalink_rule_versions').where('rule_id', rule.id).first()
    : null

  if (!eventType || !rule || !ruleVersion) {
    throw new Error('Expected event type, rule and rule version to exist')
  }

  return {
    eventTypeId: eventType.id,
    ruleVersionId: ruleVersion.id,
  }
}

async function createSojalinkEvent(
  dependencies: EventDependencies,
  attributes: Partial<{
    processedAt: DateTime | null
    processingStartedAt: DateTime | null
    createdAt: DateTime
    sourceEntityId: string
    status: string
  }> = {}
) {
  const sourceEntityId = attributes.sourceEntityId ?? `worksheet-${Date.now()}-${Math.random()}`

  const event = new SojalinkEvent()

  event.eventTypeId = dependencies.eventTypeId
  event.sourceApp = 'sojadispro'
  event.sourceEntityType = 'worksheet'
  event.sourceEntityId = sourceEntityId
  event.status = attributes.status ?? 'pending'
  event.payloadJson = JSON.stringify({ id: sourceEntityId })
  event.appliedRuleVersionId = dependencies.ruleVersionId
  event.resolutionSnapshotJson = '{}'
  event.processingStartedAt = attributes.processingStartedAt ?? null
  event.processedAt = attributes.processedAt ?? null

  if (attributes.createdAt) {
    event.createdAt = attributes.createdAt
  }

  await event.save()

  return event
}

test.group('EventRepository.reserveNextPendingEvent', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('returns null when there is no pending event', async ({ assert }) => {
    const reservedEvent = await new EventRepository().reserveNextPendingEvent()

    assert.isNull(reservedEvent)
  })

  test('reserves one pending event and returns a ProcessingEvent', async ({ assert }) => {
    const dependencies = await seedEventDependencies()

    const event = await createSojalinkEvent(dependencies, {
      sourceEntityId: 'worksheet-to-reserve',
    })

    const reservedEvent = await new EventRepository().reserveNextPendingEvent()

    await event.refresh()

    assert.equal(event.status, 'processing')
    assert.isNotNull(event.processingStartedAt)

    assert.containSubset(reservedEvent, {
      id: event.id,
      status: 'processing',
      eventTypeId: dependencies.eventTypeId,
      sourceApp: 'sojadispro',
      sourceEntityType: 'worksheet',
      sourceEntityId: 'worksheet-to-reserve',
      payload: JSON.stringify({ id: 'worksheet-to-reserve' }),
    })

    assert.equal(reservedEvent?.createdAt.toISO(), event.createdAt.toISO())
    assert.isNotNull(reservedEvent?.processingStartedAt)
  })

  test('ignores events that are already processing, processed or failed', async ({ assert }) => {
    const dependencies = await seedEventDependencies()
    const processingStartedAt = DateTime.utc(2026, 1, 1)

    await createSojalinkEvent(dependencies, {
      sourceEntityId: 'processing-event',
      processingStartedAt,
      status: 'processing',
    })

    await createSojalinkEvent(dependencies, {
      sourceEntityId: 'processed-event',
      processedAt: DateTime.utc(2026, 1, 2),
      processingStartedAt,
      status: 'processed',
    })

    await createSojalinkEvent(dependencies, {
      sourceEntityId: 'failed-event',
      processingStartedAt,
      status: 'failed',
    })

    const reservedEvent = await new EventRepository().reserveNextPendingEvent()

    assert.isNull(reservedEvent)
  })

  test('reserves the oldest pending event first', async ({ assert }) => {
    const dependencies = await seedEventDependencies()

    await createSojalinkEvent(dependencies, {
      sourceEntityId: 'newer-event',
      createdAt: DateTime.utc(2026, 1, 2),
    })

    const olderEvent = await createSojalinkEvent(dependencies, {
      sourceEntityId: 'older-event',
      createdAt: DateTime.utc(2026, 1, 1),
    })

    const reservedEvent = await new EventRepository().reserveNextPendingEvent()

    assert.equal(reservedEvent?.id, olderEvent.id)

    const pendingEvents = await SojalinkEvent.query().where('status', 'pending')

    assert.lengthOf(pendingEvents, 1)
    assert.equal(pendingEvents[0].sourceEntityId, 'newer-event')
  })

  test('does not reserve the same event twice under concurrency', async ({ assert }) => {
    const dependencies = await seedEventDependencies()
    const event = await createSojalinkEvent(dependencies)
    const repository = new EventRepository()

    const reservedEvents = await Promise.all([
      repository.reserveNextPendingEvent(),
      repository.reserveNextPendingEvent(),
    ])

    await event.refresh()

    assert.equal(event.status, 'processing')

    assert.lengthOf(
      reservedEvents.filter((reservedEvent) => reservedEvent?.id === event.id),
      1
    )

    assert.lengthOf(
      reservedEvents.filter((reservedEvent) => reservedEvent === null),
      1
    )
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
