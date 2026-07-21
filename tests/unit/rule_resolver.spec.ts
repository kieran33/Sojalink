import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import SojalinkEventTypeSeeder from '#database/seeders/sojalink_event_type_seeder'
import SojalinkRuleSeeder from '#database/seeders/sojalink_rule_seeder'
import SojalinkRuleVersionSeeder from '#database/seeders/sojalink_rule_version_seeder'
import SojalinkEvent from '#models/sojalink_event'
import { RuleResolver } from '#application/events/rule_resolver'
import { evaluateRuleConditions } from '#application/events/evaluate_rule_conditions'
import { RuleRepository } from '#persistence/events/rule_repository'

type Event = {
  eventTypeId: number
  ruleId: number
  ruleVersionId: number
}

async function seedEvent(): Promise<Event> {
  const client = db.connection()

  await new SojalinkEventTypeSeeder(client).run()
  await new SojalinkRuleSeeder(client).run()
  await new SojalinkRuleVersionSeeder(client).run()

  const eventType = await db.from('sojalink_event_types').orderBy('id', 'desc').first()
  const rule = await db.from('sojalink_rules').orderBy('id', 'desc').first()
  const ruleVersion = rule
    ? await db
        .from('sojalink_rule_versions')
        .where('rule_id', rule.id)
        .orderBy('id', 'desc')
        .first()
    : null

  if (!eventType || !rule || !ruleVersion) {
    throw new Error('Expected event type, rule and rule version to exist')
  }

  await db
    .from('sojalink_rule_versions')
    .where('id', ruleVersion.id)
    .update({
      conditions_json: JSON.stringify({
        op: 'eq',
        field: 'payload.source_app',
        value: 'SojadisPro',
      }),
    })

  return {
    eventTypeId: eventType.id,
    ruleId: rule.id,
    ruleVersionId: ruleVersion.id,
  }
}

async function createSojalinkEvent(
  dependencies: Event,
  attributes: Partial<{
    sourceApp: string
    sourceEntityType: string
    sourceEntityId: number
    payloadJson: string
    status: string
  }> = {}
) {
  const event = new SojalinkEvent()

  event.eventTypeId = dependencies.eventTypeId
  event.sourceApp = attributes.sourceApp ?? 'sojadispro'
  event.sourceEntityType = attributes.sourceEntityType ?? 'worksheet'
  event.sourceEntityId = attributes.sourceEntityId ?? Math.random()
  event.status = attributes.status ?? 'processing'
  event.payloadJson = attributes.payloadJson ?? JSON.stringify({ source_app: 'sojadispro' })
  event.appliedRuleVersionId = null
  event.resolutionSnapshotJson = null
  event.processingStartedAt = null
  event.processedAt = null

  await event.save()

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

    const resolver = new RuleResolver(new RuleRepository())

    await resolver.resolve(event.id)

    await event.refresh()

    assert.equal(event.appliedRuleVersionId, dependencies.ruleVersionId)
    assert.isNotNull(event.resolutionSnapshotJson)

    const snapshot = JSON.parse(event.resolutionSnapshotJson!)
    assert.equal(snapshot.ruleId, dependencies.ruleId)
    assert.equal(snapshot.ruleVersionId, dependencies.ruleVersionId)
    assert.isString(snapshot.resolvedAt)
  })

  test('applied_rule_version_id exist', async ({ assert }) => {
    const dependencies = await seedEvent()
    const event = await createSojalinkEvent(dependencies, {
      sourceApp: 'SojadisPro',
      payloadJson: JSON.stringify({ source_app: 'SojadisPro' }),
    })

    const resolver = new RuleResolver(new RuleRepository())

    await resolver.resolve(event.id)

    await event.refresh()

    assert.equal(event.appliedRuleVersionId, dependencies.ruleVersionId)
  })

  test('resolution_snapshot_json exist', async ({ assert }) => {
    const dependencies = await seedEvent()
    const event = await createSojalinkEvent(dependencies, {
      sourceApp: 'SojadisPro',
      payloadJson: JSON.stringify({ source_app: 'SojadisPro' }),
    })

    const resolver = new RuleResolver(new RuleRepository())

    await resolver.resolve(event.id)

    await event.refresh()

    assert.isNotNull(event.resolutionSnapshotJson)

    const snapshot = JSON.parse(event.resolutionSnapshotJson!)
    assert.equal(snapshot.ruleId, dependencies.ruleId)
    assert.equal(snapshot.ruleVersionId, dependencies.ruleVersionId)
  })

  test('ignores inactive rules', async ({ assert }) => {
    const dependencies = await seedEvent()
    const event = await createSojalinkEvent(dependencies)

    await db.from('sojalink_rules').where('id', dependencies.ruleId).update({ is_active: false })

    const resolver = new RuleResolver(new RuleRepository())

    await assert.rejects(() => resolver.resolve(event.id))
  })

  test('ignores inactive rule versions', async ({ assert }) => {
    const dependencies = await seedEvent()
    const event = await createSojalinkEvent(dependencies)

    await db
      .from('sojalink_rule_versions')
      .where('id', dependencies.ruleVersionId)
      .update({ is_active: false })

    const resolver = new RuleResolver(new RuleRepository())

    await assert.rejects(() => resolver.resolve(event.id))
  })

  test('respects rule priority', async ({ assert }) => {
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

    const resolver = new RuleResolver(new RuleRepository())
    await resolver.resolve(event.id)

    const resolvedEvent = await db.from('sojalink_events').where('id', event.id).first()
    const snapshot = JSON.parse(resolvedEvent.resolution_snapshot_json)

    assert.equal(snapshot.ruleId, secondRuleId[0])
  })

  test('rejects when no applicable rule exists', async ({ assert }) => {
    const dependencies = await seedEvent()
    const event = await createSojalinkEvent(dependencies, {
      payloadJson: JSON.stringify({ source_app: 'unknown-app' }),
    })

    const resolver = new RuleResolver(new RuleRepository())

    await assert.rejects(() => resolver.resolve(event.id))
  })

  test('rejects when several rules match', async ({ assert }) => {
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

    const resolver = new RuleResolver(new RuleRepository())

    await assert.rejects(() => resolver.resolve(event.id))
  })

  test('condition eq is valid', ({ assert }) => {
    const result = evaluateRuleConditions(
      {
        op: 'eq',
        field: 'sourceApp',
        value: 'sojadispro',
      },
      { sourceApp: 'sojadispro' }
    )

    assert.isTrue(result)
  })

  test('condition eq is invalid', ({ assert }) => {
    const result = evaluateRuleConditions(
      {
        op: 'eq',
        field: 'sourceApp',
        value: 'sojadispro',
      },
      { sourceApp: 'random_app' }
    )

    assert.isFalse(result)
  })

  test('condition on payload works correctly', ({ assert }) => {
    const result = evaluateRuleConditions(
      {
        op: 'eq',
        field: 'payload.source_app',
        value: 'sojadispro',
      },
      { payload: { source_app: 'sojadispro' } }
    )

    assert.isTrue(result)
  })

  test('condition with invalid field returns false', ({ assert }) => {
    const result = evaluateRuleConditions(
      {
        op: 'eq',
        field: 'unexpected_field',
        value: 'sojadispro',
      },
      { sourceApp: 'sojadispro' }
    )

    assert.isFalse(result)
  })

  test('invalid condition payload is managed correctly', ({ assert }) => {
    const result = evaluateRuleConditions('invalid json here' as never, {
      sourceApp: 'sojadispro',
    })

    assert.isFalse(result)
  })
})
