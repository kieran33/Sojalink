import SojalinkInitialSeeder from '#database/seeders/main/index_seeder'
import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import ace from '@adonisjs/core/services/ace'
import testUtils from '@adonisjs/core/services/test_utils'

const FK_ERROR = /foreign key/i
const UNIQUE_ERROR = /duplicate|unique/i

async function createSeededRuleContext() {
  await new SojalinkInitialSeeder(db.connection()).run()

  const eventType = await db
    .from('sojalink_event_types')
    .where('code', 'sojadispro.order.created')
    .first()
  const rule = await db
    .from('sojalink_rules')
    .where('code', 'sojadispro-order-to-toki-task')
    .first()
  const ruleVersion = await db.from('sojalink_rule_versions').where('rule_id', rule.id).first()

  return {
    eventTypeId: eventType.id,
    ruleVersionId: ruleVersion.id,
  }
}

async function createEventFromSeededRule(suffix: string) {
  const seededRule = await createSeededRuleContext()
  const [eventId] = await db.table('sojalink_events').insert({
    event_type_id: seededRule.eventTypeId,
    source_app: 'sojadispro',
    source_entity_type: 'order',
    source_entity_id: `order-${suffix}`,
    correlation_key: `event-correlation-${suffix}`,
    status: 'pending',
    payload_json: '{}',
    applied_rule_version_id: seededRule.ruleVersionId,
    resolution_snapshot_json: '{}',
    created_at: new Date(),
    occurred_at: new Date(),
  })

  await db.table('sojalink_entity_correlations').insert({
    source_app: 'sojadispro',
    source_entity_type: 'order',
    source_entity_id: `order-${suffix}`,
    target_app: 'toki',
    target_entity_type: 'task',
    target_entity_id: `task-${suffix}`,
    correlation_key: `entity-correlation-${suffix}`,
    created_by_event_id: eventId,
    created_at: new Date(),
  })

  return { ...seededRule, eventId }
}

test.group('Sojalink database constraints', (group) => {
  group.setup(async () => {
    await ace.exec('migration:run', ['--force'])
  })

  group.each.setup(async () => {
    return testUtils.db().wrapInGlobalTransaction()
  })

  test('rejects an event linked to an unknown applied rule version', async ({ assert }) => {
    const seededRule = await createSeededRuleContext()

    await assert.rejects(
      () =>
        db.table('sojalink_events').insert({
          event_type_id: seededRule.eventTypeId,
          source_app: 'sojadispro',
          source_entity_type: 'order',
          source_entity_id: 'order-invalid-rule-version',
          correlation_key: 'event-invalid-rule-version',
          status: 'pending',
          payload_json: '{}',
          applied_rule_version_id: 9999,
          resolution_snapshot_json: '{}',
          created_at: new Date(),
          occurred_at: new Date(),
        }),
      FK_ERROR
    )
  })

  test('rejects duplicate event correlation keys', async ({ assert }) => {
    const graph = await createEventFromSeededRule('event-unique')

    await assert.rejects(
      () =>
        db.table('sojalink_events').insert({
          event_type_id: graph.eventTypeId,
          source_app: 'sojadispro',
          source_entity_type: 'order',
          source_entity_id: 'order-duplicate-event-correlation',
          correlation_key: 'event-correlation-event-unique',
          status: 'pending',
          payload_json: '{}',
          applied_rule_version_id: graph.ruleVersionId,
          resolution_snapshot_json: '{}',
          created_at: new Date(),
          occurred_at: new Date(),
        }),
      UNIQUE_ERROR
    )
  })

  test('rejects duplicate entity correlation keys', async ({ assert }) => {
    const graph = await createEventFromSeededRule('entity-key-unique')

    await assert.rejects(
      () =>
        db.table('sojalink_entity_correlations').insert({
          source_app: 'sojadispro',
          source_entity_type: 'order',
          source_entity_id: 'order-duplicate-entity-correlation',
          target_app: 'toki',
          target_entity_type: 'task',
          target_entity_id: 'task-duplicate-entity-correlation',
          correlation_key: 'entity-correlation-entity-key-unique',
          created_by_event_id: graph.eventId,
          created_at: new Date(),
        }),
      UNIQUE_ERROR
    )
  })

  test('rejects duplicate source and target entity pairs', async ({ assert }) => {
    const graph = await createEventFromSeededRule('entity-pair-unique')

    await assert.rejects(
      () =>
        db.table('sojalink_entity_correlations').insert({
          source_app: 'sojadispro',
          source_entity_type: 'order',
          source_entity_id: 'order-entity-pair-unique',
          target_app: 'toki',
          target_entity_type: 'task',
          target_entity_id: 'task-duplicate-pair',
          correlation_key: 'entity-correlation-duplicate-pair',
          created_by_event_id: graph.eventId,
          created_at: new Date(),
        }),
      UNIQUE_ERROR
    )
  })
})
