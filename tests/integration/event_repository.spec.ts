import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import SojalinkEvent from '#models/sojalink_event'
import { EventRepository } from '#persistence/events/event_repository'
import { seedEventGraph, type EventGraph } from '#tests/helpers/event_graph_factory'

async function createSojalinkEvent(
  dependencies: EventGraph,
  attributes: Partial<{
    processedAt: DateTime | null
    processingStartedAt: DateTime | null
    createdAt: DateTime
    sourceEntityId: number
    status: string
  }> = {}
) {
  const sourceEntityId = attributes.sourceEntityId ?? Math.floor(Math.random() * 100000)

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
  group.each.setup(async () => {
    await db.from('sojalink_step_logs').delete()
    await db.from('sojalink_attempts').delete()
    await db.from('sojalink_entity_correlations').delete()
    await db.from('sojalink_events').delete()
    await db.from('sojalink_rule_versions').delete()
    await db.from('sojalink_rules').delete()
    await db.from('sojalink_event_types').delete()
  })

  group.teardown(async () => {
    await db.from('sojalink_step_logs').delete()
    await db.from('sojalink_attempts').delete()
    await db.from('sojalink_entity_correlations').delete()
    await db.from('sojalink_events').delete()
    await db.from('sojalink_rule_versions').delete()
    await db.from('sojalink_rules').delete()
    await db.from('sojalink_event_types').delete()
  })

  test('returns null when there is no pending event', async ({ assert }) => {
    const reservedEvent = await new EventRepository().reserveNextPendingEvent()

    assert.isNull(reservedEvent)
  })

  test('reserves one pending event and returns a ProcessingEvent', async ({ assert }) => {
    const dependencies = await seedEventGraph()

    const event = await createSojalinkEvent(dependencies, {
      sourceEntityId: 1,
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
      sourceEntityId: 1,
      payload: { id: 1 },
    })

    assert.equal(reservedEvent?.createdAt.toISO(), event.createdAt.toISO())
    assert.isNotNull(reservedEvent?.processingStartedAt)
  })

  test('ignores events that are already processing, processed or failed', async ({ assert }) => {
    const dependencies = await seedEventGraph()
    const processingStartedAt = DateTime.utc(2026, 1, 1)

    await createSojalinkEvent(dependencies, {
      sourceEntityId: 4,
      processingStartedAt,
      status: 'processing',
    })

    await createSojalinkEvent(dependencies, {
      sourceEntityId: 5,
      processedAt: DateTime.utc(2026, 1, 2),
      processingStartedAt,
      status: 'processed',
    })

    await createSojalinkEvent(dependencies, {
      sourceEntityId: 6,
      processingStartedAt,
      status: 'failed',
    })

    const reservedEvent = await new EventRepository().reserveNextPendingEvent()

    assert.isNull(reservedEvent)
  })

  test('reserves the oldest pending event first', async ({ assert }) => {
    const dependencies = await seedEventGraph()

    await createSojalinkEvent(dependencies, {
      sourceEntityId: 2,
      createdAt: DateTime.utc(2026, 1, 2),
    })

    const olderEvent = await createSojalinkEvent(dependencies, {
      sourceEntityId: 3,
      createdAt: DateTime.utc(2026, 1, 1),
    })

    const reservedEvent = await new EventRepository().reserveNextPendingEvent()

    assert.equal(reservedEvent?.id, olderEvent.id)

    const pendingEvents = await SojalinkEvent.query().where('status', 'pending')

    assert.lengthOf(pendingEvents, 1)
    assert.equal(pendingEvents[0].sourceEntityId, 2)
  })

  test('does not reserve the same event twice under concurrency', async ({ assert }) => {
    const dependencies = await seedEventGraph()
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
