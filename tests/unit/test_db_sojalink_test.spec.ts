import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import ace from '@adonisjs/core/services/ace'

test.group('Sanity check', () => {
  test('Check if database sojalink_test is configured correctly with env variable', async ({
    assert,
  }) => {
    assert.equal(process.env.DB_DATABASE, 'sojalink_test')
    console.log('La configuration est correct pour ' + process.env.DB_DATABASE)
  })

  test('Check if database sojalink_test is used correctly with mysql request', async ({
    assert,
  }) => {
    const result = await db.rawQuery('SELECT DATABASE() as db_name')
    assert.equal(result[0][0].db_name, 'sojalink_test')
    console.log('La base de donnée ' + result[0][0].db_name + ' a été créer correctement')
  })
})

test.group('Test migration database sojalink_test', (group) => {
  group.setup(async () => {
    await ace.exec('migration:run', ['--force'])
  })

  test('Check if all tables in database sojalink_test are correctly created', async ({
    assert,
  }) => {
    const result = await db.rawQuery(`
      SELECT TABLE_NAME FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
    `)

    const tables = result[0].map((row: any) => row.TABLE_NAME)

    assert.include(tables, 'sojalink_event_types')
    assert.include(tables, 'sojalink_rules')
    assert.include(tables, 'sojalink_rule_versions')
    assert.include(tables, 'sojalink_events')
    assert.include(tables, 'sojalink_attempts')
    assert.include(tables, 'sojalink_step_logs')
    assert.include(tables, 'sojalink_entity_correlations')

    console.log('Toutes les tables ont été créées correctement ' + tables)
  })

  test('Delete all tables in database sojalink_test', async ({ assert }) => {
    await ace.exec('migration:rollback', ['--force', '--batch=0'])

    const result = await db.rawQuery(`
      SELECT TABLE_NAME FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME NOT IN ('adonis_schema', 'adonis_schema_versions')
    `)

    const tables = result[0].map((row: any) => row.TABLE_NAME)
    assert.isEmpty(tables)

    console.log('Toutes les tables ont étés supprimés correctement ' + result)
    console.log(tables)
  })
})
