import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'

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

const QUEUE_TABLES = ['queue_jobs', 'queue_schedules']

test.group('Sojalink migrations', () => {
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

  test('creates the queue tables used by the polling worker', async ({ assert }) => {
    const result = await db.rawQuery(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME LIKE 'queue_%'
    `)

    const tableNames = result[0].map((row: { TABLE_NAME: string }) => row.TABLE_NAME)

    assert.sameMembers(tableNames, QUEUE_TABLES)
  })
})
