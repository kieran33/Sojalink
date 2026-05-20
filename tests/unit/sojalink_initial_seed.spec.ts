import SojalinkInitialSeeder from '#database/seeders/main/index_seeder'
import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import ace from '@adonisjs/core/services/ace'
import testUtils from '@adonisjs/core/services/test_utils'

async function runInitialSeeder() {
  await new SojalinkInitialSeeder(db.connection()).run()
}

test.group('Sojalink initial seed', (group) => {
  group.setup(async () => {
    await ace.exec('migration:run', ['--force'])
  })

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

    assert.lengthOf(eventTypes, 1)
    assert.lengthOf(rules, 1)
  })

  test('creates the expected initial event type, rule and rule version', async ({ assert }) => {
    await runInitialSeeder()

    const eventType = await db
      .from('sojalink_event_types')
      .where('code', 'sojadispro.order.created')
      .first()
    const rule = await db
      .from('sojalink_rules')
      .where('code', 'sojadispro-order-to-toki-task')
      .first()
    const ruleVersion = await db.from('sojalink_rule_versions').where('rule_id', rule.id).first()

    assert.exists(eventType)
    assert.exists(rule)
    assert.exists(ruleVersion)
    assert.equal(eventType.is_active, 1)
    assert.equal(rule.event_type_id, eventType.id)
    assert.equal(ruleVersion.version_number, 1)
    assert.equal(ruleVersion.is_active, 1)
  })
})
