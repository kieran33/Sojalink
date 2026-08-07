import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import SojalinkEvent from '#models/sojalink_event'
import { RuleResolver } from '#application/events/rule_resolver'
import { RuleRepository } from '#persistence/events/rule_repository'
import { EventRepository } from '#persistence/events/event_repository'
import type { ProcessingEvent } from '#domain/events/event'
import { seedEventGraph, type EventGraph } from '#tests/helpers/event_graph_factory'

type EventDependencies = EventGraph

/**
 * seedEventGraph() overridden with a condition this file's tests can
 * reliably satisfy or violate (`payload.source_app`) rather than the
 * seeded default.
 */
async function seedEvent(): Promise<EventDependencies> {
  const graph = await seedEventGraph()

  await db
    .from('sojalink_rule_versions')
    .where('id', graph.ruleVersionId)
    .update({
      conditions_json: JSON.stringify({
        op: 'eq',
        field: 'payload.source_app',
        value: 'SojadisPro',
      }),
    })

  return graph
}

async function createSojalinkEvent(
  dependencies: EventDependencies,
  attributes: Partial<{
    sourceApp: string
    sourceEntityType: string
    sourceEntityId: number
    payloadJson: string
    status: string
    processingStartedAt: DateTime | null
  }> = {}
) {
  const event = new SojalinkEvent()

  event.eventTypeId = dependencies.eventTypeId
  event.sourceApp = attributes.sourceApp ?? 'sojadispro'
  event.sourceEntityType = attributes.sourceEntityType ?? 'worksheet'
  event.sourceEntityId = attributes.sourceEntityId ?? Math.floor(Math.random() * 100000)
  event.status = attributes.status ?? 'processing'
  event.payloadJson = attributes.payloadJson ?? JSON.stringify({ source_app: 'sojadispro' })
  event.appliedRuleVersionId = null
  event.resolutionSnapshotJson = null
  event.processingStartedAt = attributes.processingStartedAt ?? DateTime.utc()
  event.processedAt = null

  await event.save()

  return event
}

function createResolver() {
  return new RuleResolver(new RuleRepository(), new EventRepository())
}

async function getProcessingEvent(eventId: number): Promise<ProcessingEvent> {
  const event = await new EventRepository().findProcessingEvent(eventId)

  if (!event) {
    throw new Error(`Expected event ${eventId} to be processing`)
  }

  return event
}

test.group('rule resolver', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('resolves an applicable rule and stores the resolution snapshot', async ({ assert }) => {
    const dependencies = await seedEvent()
    const event = await createSojalinkEvent(dependencies, {
      sourceApp: 'SojadisPro',
      payloadJson: JSON.stringify({ source_app: 'SojadisPro' }),
    })

    const resolution = await createResolver().resolve(await getProcessingEvent(event.id))

    assert.equal(resolution.ruleVersionId, dependencies.ruleVersionId)

    await event.refresh()

    assert.equal(event.appliedRuleVersionId, dependencies.ruleVersionId)
    assert.isNotNull(event.resolvedAt)
    assert.isNotNull(event.resolutionSnapshotJson)

    const snapshot = JSON.parse(event.resolutionSnapshotJson!)
    assert.equal(snapshot.ruleId, dependencies.ruleId)
    assert.equal(snapshot.ruleVersionId, dependencies.ruleVersionId)
    assert.isString(snapshot.ruleCode)
    assert.isString(snapshot.resolvedAt)
  })

  test('ignores inactive rules', async ({ assert }) => {
    const dependencies = await seedEvent()
    const event = await createSojalinkEvent(dependencies)

    await db.from('sojalink_rules').where('id', dependencies.ruleId).update({ is_active: false })

    await assert.rejects(async () => createResolver().resolve(await getProcessingEvent(event.id)))
  })

  test('ignores inactive rule versions', async ({ assert }) => {
    const dependencies = await seedEvent()
    const event = await createSojalinkEvent(dependencies)

    await db
      .from('sojalink_rule_versions')
      .where('id', dependencies.ruleVersionId)
      .update({ is_active: false })

    await assert.rejects(async () => createResolver().resolve(await getProcessingEvent(event.id)))
  })

  test('uses the latest active version of a rule', async ({ assert }) => {
    const dependencies = await seedEvent()
    const event = await createSojalinkEvent(dependencies, {
      sourceApp: 'SojadisPro',
      payloadJson: JSON.stringify({ source_app: 'SojadisPro' }),
    })

    const newVersionId = await db.table('sojalink_rule_versions').insert({
      rule_id: dependencies.ruleId,
      version_number: 2,
      is_active: true,
      conditions_json: JSON.stringify({
        op: 'eq',
        field: 'payload.source_app',
        value: 'SojadisPro',
      }),
      pipeline_json: JSON.stringify({
        steps: [{ key: 'notify_team', handler: 'email_notification' }],
      }),
    })

    const resolution = await createResolver().resolve(await getProcessingEvent(event.id))

    assert.equal(resolution.ruleVersionId, newVersionId[0])
  })

  test('respects rule priority (lowest number wins)', async ({ assert }) => {
    const dependencies = await seedEvent()
    const event = await createSojalinkEvent(dependencies, {
      sourceApp: 'SojadisPro',
      payloadJson: JSON.stringify({ source_app: 'SojadisPro' }),
    })

    const secondRuleId = await db.table('sojalink_rules').insert({
      event_type_id: dependencies.eventTypeId,
      code: 'second-rule',
      label: 'Second rule',
      priority: 1,
      is_active: true,
    })

    await db.table('sojalink_rule_versions').insert({
      rule_id: secondRuleId[0],
      version_number: 1,
      is_active: true,
      conditions_json: JSON.stringify({
        op: 'eq',
        field: 'payload.source_app',
        value: 'SojadisPro',
      }),
      pipeline_json: JSON.stringify({ steps: [] }),
    })

    await createResolver().resolve(await getProcessingEvent(event.id))

    const resolvedEvent = await db.from('sojalink_events').where('id', event.id).first()
    const snapshot = JSON.parse(resolvedEvent.resolution_snapshot_json)

    assert.equal(snapshot.ruleId, secondRuleId[0])
  })

  test('fails with NoMatchingRuleError when no rule applies', async ({ assert }) => {
    const dependencies = await seedEvent()
    const event = await createSojalinkEvent(dependencies, {
      payloadJson: JSON.stringify({ source_app: 'unknown-app' }),
    })

    await assert.rejects(
      async () => createResolver().resolve(await getProcessingEvent(event.id)),
      /No rule matches/
    )

    await event.refresh()

    assert.isNull(event.appliedRuleVersionId)
    assert.equal(event.resolutionErrorCode, 'NoMatchingRuleError')
    assert.isNotNull(event.resolutionErrorMessage)
  })

  test('fails with MultipleMatchingRulesError when several rules match', async ({ assert }) => {
    const dependencies = await seedEvent()
    const event = await createSojalinkEvent(dependencies, {
      sourceApp: 'SojadisPro',
      payloadJson: JSON.stringify({ source_app: 'SojadisPro' }),
    })

    const secondRuleId = await db.table('sojalink_rules').insert({
      event_type_id: dependencies.eventTypeId,
      code: 'duplicate-rule',
      label: 'Duplicate rule',
      priority: 5,
      is_active: true,
    })

    await db.table('sojalink_rule_versions').insert({
      rule_id: secondRuleId[0],
      version_number: 1,
      is_active: true,
      conditions_json: JSON.stringify({
        op: 'eq',
        field: 'payload.source_app',
        value: 'SojadisPro',
      }),
      pipeline_json: JSON.stringify({ steps: [] }),
    })

    await assert.rejects(
      async () => createResolver().resolve(await getProcessingEvent(event.id)),
      /rules match/
    )

    await event.refresh()

    assert.equal(event.resolutionErrorCode, 'MultipleMatchingRulesError')
  })
})
