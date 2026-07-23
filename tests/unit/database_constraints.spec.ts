import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import SojalinkEventTypeSeeder from '#database/seeders/sojalink_event_type_seeder'
import SojalinkRuleSeeder from '#database/seeders/sojalink_rule_seeder'
import SojalinkRuleVersionSeeder from '#database/seeders/sojalink_rule_version_seeder'

const FK_ERROR = /foreign key/i
const UNIQUE_ERROR = /duplicate|unique/i

type RuleContext = {
  eventTypeId: number
  ruleVersionId: number
}

async function seedRuleContext(): Promise<RuleContext> {
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

async function insertEvent(context: RuleContext, sourceEntityId?: number) {
  const entityId = sourceEntityId ?? Math.floor(Math.random() * 1000)

  const [eventId] = await db.table('sojalink_events').insert({
    event_type_id: context.eventTypeId,
    source_app: 'sojadispro',
    source_entity_type: 'worksheet',
    source_entity_id: entityId,
    status: 'pending',
    payload_json: '{}',
    applied_rule_version_id: context.ruleVersionId,
    resolution_snapshot_json: '{}',
  })

  return eventId
}

async function insertCorrelation(
  eventId: number,
  suffix: string,
  sourceEntityId?: number,
  targetEntityId?: number
) {
  await db.table('sojalink_entity_correlations').insert({
    source_app: 'sojadispro',
    source_entity_type: 'order',
    source_entity_id: sourceEntityId ?? Math.floor(Math.random() * 1000),
    target_app: 'toki',
    target_entity_type: 'task',
    target_entity_id: targetEntityId ?? Math.floor(Math.random() * 1000),
    correlation_key: `entity-correlation-${suffix}`,
    created_by_event_id: eventId,
  })
}

async function insertAttempt(eventId: number) {
  const [attemptId] = await db.table('sojalink_attempts').insert({
    event_id: eventId,
    attempt_number: 1,
    status: 'started',
    error_code: null,
    error_message: null,
    finished_at: null,
  })

  return attemptId
}

test.group('Sojalink database constraints', (group) => {
  group.each.setup(async () => {
    await db.from('sojalink_step_logs').delete()
    await db.from('sojalink_attempts').delete()
    await db.from('sojalink_entity_correlations').delete()
    await db.from('sojalink_events').delete()
    await db.from('sojalink_rule_versions').delete()
    await db.from('sojalink_rules').delete()
    await db.from('sojalink_event_types').delete()
  })

  test('events must reference an existing event type', async ({ assert }) => {
    const context = await seedRuleContext()

    await assert.rejects(
      () =>
        db.table('sojalink_events').insert({
          event_type_id: 9999,
          source_app: 'sojadispro',
          source_entity_type: 'worksheet',
          source_entity_id: 1,
          status: 'pending',
          payload_json: '{}',
          applied_rule_version_id: context.ruleVersionId,
          resolution_snapshot_json: '{}',
        }),
      FK_ERROR
    )
  })

  test('events must reference an existing applied rule version', async ({ assert }) => {
    const context = await seedRuleContext()

    const [eventId] = await db.table('sojalink_events').insert({
      event_type_id: context.eventTypeId,
      source_app: 'sojadispro',
      source_entity_type: 'worksheet',
      source_entity_id: 1,
      status: 'pending',
      payload_json: '{}',
      applied_rule_version_id: context.ruleVersionId,
      resolution_snapshot_json: '{}',
    })

    assert.isNumber(eventId)
  })

  test('entity correlations must reference an existing source event', async ({ assert }) => {
    await assert.rejects(() => insertCorrelation(9999, 'invalid-source-event'), FK_ERROR)
  })

  test('attempts must reference an existing event', async ({ assert }) => {
    await assert.rejects(
      () =>
        db.table('sojalink_attempts').insert({
          event_id: 9999,
          attempt_number: 1,
          status: 'started',
          error_code: null,
          error_message: null,
          finished_at: null,
        }),
      FK_ERROR
    )
  })

  test('step logs must reference an existing attempt', async ({ assert }) => {
    await assert.rejects(
      () =>
        db.table('sojalink_step_logs').insert({
          attempt_id: 9999,
          step_index: 1,
          step_code: 'resolve-target',
          handler_name: 'handler.resolve_target',
          status: 'started',
          input_json: '{}',
          output_json: null,
          error_code: null,
          error_message: null,
          finished_at: null,
        }),
      FK_ERROR
    )
  })

  test('events must be unique per source entity and event type', async ({ assert }) => {
    const context = await seedRuleContext()
    const sourceEntityId = Math.floor(Math.random() * 1000)

    await insertEvent(context, sourceEntityId)

    await assert.rejects(
      () =>
        db.table('sojalink_events').insert({
          event_type_id: context.eventTypeId,
          source_app: 'sojadispro',
          source_entity_type: 'worksheet',
          source_entity_id: sourceEntityId,
          status: 'pending',
          payload_json: '{}',
          applied_rule_version_id: context.ruleVersionId,
          resolution_snapshot_json: '{}',
        }),
      UNIQUE_ERROR
    )
  })

  test('events can reuse source entities across event types', async ({ assert }) => {
    const context = await seedRuleContext()
    const sourceEntityId = Math.floor(Math.random() * 1000)

    await insertEvent(context, sourceEntityId)

    const [otherEventTypeId] = await db.table('sojalink_event_types').insert({
      code: 'sojadispro.order.updated',
      label: 'Order updated',
    })

    const [eventId] = await db.table('sojalink_events').insert({
      event_type_id: otherEventTypeId,
      source_app: 'sojadispro',
      source_entity_type: 'worksheet',
      source_entity_id: sourceEntityId,
      status: 'pending',
      payload_json: '{}',
      applied_rule_version_id: context.ruleVersionId,
      resolution_snapshot_json: '{}',
    })

    assert.isNumber(eventId)
  })

  test('entity correlation keys must be unique', async ({ assert }) => {
    const context = await seedRuleContext()
    const eventId = await insertEvent(context)

    await insertCorrelation(eventId, 'unique-entity-key')

    await assert.rejects(
      () =>
        db.table('sojalink_entity_correlations').insert({
          source_app: 'sojadispro',
          source_entity_type: 'order',
          source_entity_id: Math.floor(Math.random() * 1000),
          target_app: 'toki',
          target_entity_type: 'task',
          target_entity_id: Math.floor(Math.random() * 1000),
          correlation_key: 'entity-correlation-unique-entity-key',
          created_by_event_id: eventId,
        }),
      UNIQUE_ERROR
    )
  })

  test('source and target entity pairs must be unique', async ({ assert }) => {
    const context = await seedRuleContext()
    const eventId = await insertEvent(context)
    const sourceEntityId = Math.floor(Math.random() * 1000)
    const targetEntityId = Math.floor(Math.random() * 1000)

    await insertCorrelation(eventId, 'unique-entity-pair', sourceEntityId, targetEntityId)

    await assert.rejects(
      () =>
        db.table('sojalink_entity_correlations').insert({
          source_app: 'sojadispro',
          source_entity_type: 'order',
          source_entity_id: sourceEntityId,
          target_app: 'toki',
          target_entity_type: 'task',
          target_entity_id: targetEntityId,
          correlation_key: 'entity-correlation-duplicate-pair',
          created_by_event_id: eventId,
        }),
      UNIQUE_ERROR
    )
  })

  test('valid event, correlation, attempt and step log rows can be inserted', async ({
    assert,
  }) => {
    const context = await seedRuleContext()
    const eventId = await insertEvent(context)

    await insertCorrelation(eventId, 'valid-graph')

    const attemptId = await insertAttempt(eventId)

    await db.table('sojalink_step_logs').insert({
      attempt_id: attemptId,
      step_index: 1,
      step_code: 'resolve-target',
      handler_name: 'handler.resolve_target',
      status: 'finished',
      input_json: '{}',
      output_json: '{}',
      error_code: null,
      error_message: null,
      started_at: new Date(),
      finished_at: new Date(),
    })

    const counts = await Promise.all([
      db.from('sojalink_events').count('* as total').first(),
      db.from('sojalink_entity_correlations').count('* as total').first(),
      db.from('sojalink_attempts').count('* as total').first(),
      db.from('sojalink_step_logs').count('* as total').first(),
    ])

    assert.deepEqual(
      counts.map((row) => Number(row?.total)),
      [1, 1, 1, 1]
    )
  })
})
