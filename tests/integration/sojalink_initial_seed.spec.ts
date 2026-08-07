import SojalinkInitialSeeder from '#database/seeders/main/index_seeder'
import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'

async function runInitialSeeder() {
  await new SojalinkInitialSeeder(db.connection()).run()
}

test.group('Sojalink initial seed', (group) => {
  group.each.setup(async () => {
    return testUtils.db().wrapInGlobalTransaction()
  })

  test('runs the initial seeder without error', async ({ assert }) => {
    await assert.doesNotReject(runInitialSeeder)
  })

  test('keeps the initial seeder idempotent', async ({ assert }) => {
    await runInitialSeeder()
    await runInitialSeeder()

    const eventTypes = await db
      .from('sojalink_event_types')
      .where('code', 'sojadispro.order.created')
    const rules = await db.from('sojalink_rules').where('code', 'sojadispro-order-to-toki-task')
    const events = await db
      .from('sojalink_events')
      .where('source_app', 'SojadisPro')
      .where('source_entity_type', 'worksheet')
      .where('source_entity_id', 95)

    assert.lengthOf(eventTypes, 1)
    assert.lengthOf(rules, 1)
    assert.lengthOf(events, 1)
  })

  test('creates the expected initial event graph', async ({ assert }) => {
    await runInitialSeeder()

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
    const event = await db
      .from('sojalink_events')
      .where('source_app', 'SojadisPro')
      .where('source_entity_type', 'worksheet')
      .where('source_entity_id', 95)
      .first()

    assert.exists(eventType)
    assert.exists(rule)
    assert.exists(ruleVersion)
    assert.exists(event)
    assert.equal(eventType.is_active, 1)
    assert.equal(rule.event_type_id, eventType.id)
    assert.equal(ruleVersion.version_number, 1)
    assert.equal(ruleVersion.is_active, 1)
    assert.equal(event.event_type_id, eventType.id)
    assert.isNull(event.applied_rule_version_id)
    assert.equal(event.status, 'pending')
  })
})
