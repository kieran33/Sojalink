import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import ace from '@adonisjs/core/services/ace'

const TEST_DATABASE_NAME = 'sojalink_test'

const SOJALINK_TABLES = [
  'sojalink_event_types',
  'sojalink_rules',
  'sojalink_rule_versions',
  'sojalink_events',
  'sojalink_attempts',
  'sojalink_step_logs',
  'sojalink_entity_correlations',
]

test.group('Sojalink migrations', (group) => {
  group.setup(async () => {
    await ace.exec('migration:run', ['--force'])
  })

  test('uses the dedicated test database', async ({ assert }) => {
    assert.equal(process.env.DB_DATABASE, TEST_DATABASE_NAME)

    const result = await db.rawQuery('SELECT DATABASE() as database_name')

    assert.equal(result[0][0].database_name, TEST_DATABASE_NAME)
  })

  test('creates every Sojalink table', async ({ assert }) => {
    const result = await db.rawQuery(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME LIKE 'sojalink_%'
    `)

    const tableNames = result[0].map((row: { TABLE_NAME: string }) => row.TABLE_NAME)

    assert.sameMembers(tableNames, SOJALINK_TABLES)
  })
})
