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
})

const data = {
  eventType: {
    id: 1,
    code: 'ORDER_CREATED',
    label: 'Commande créée',
    is_active: true,
    created_at: new Date(),
  },
  rule: {
    id: 1,
    event_type_id: 1,
    code: 'RULE_001',
    label: 'Règle test',
    priority: 1,
    is_active: true,
    created_at: new Date(),
  },
  ruleVersion: {
    id: 1,
    rule_id: 1,
    version_number: 1,
    is_active: true,
    conditions_json: '{}',
    pipeline_json: '{}',
    created_at: new Date(),
  },
  event: {
    id: 1,
    event_type_id: 1,
    source_app: 'app-a',
    source_entity_type: 'user',
    source_entity_id: '123',
    correlation_key: 'corr-001',
    status: 'pending',
    payload_json: '{}',
    applied_rule_version_id: 1,
    resolution_snapshot_json: '{}',
    created_at: new Date(),
    occurred_at: new Date(),
  },
  attempt: {
    id: 1,
    event_id: 1,
    attempt_number: 1,
    status: 'success',
    started_at: new Date(),
  },
  stepLog: {
    id: 1,
    attempt_id: 1,
    step_index: 0,
    step_code: 'step_test',
    handler_key: 'handler_test',
    status: 'success',
    input_json: '{}',
    started_at: new Date(),
  },
  entityCorrelation: {
    source_app: 'app-a',
    source_entity_type: 'user',
    source_entity_id: '123',
    target_app: 'app-b',
    target_entity_type: 'account',
    target_entity_id: '456',
    correlation_key: 'ec-001',
    created_by_event_id: 1,
    created_at: new Date(),
  },
}

test.group('Check foreign key', (group) => {
  group.each.setup(async () => {
    await db.from('sojalink_step_logs').delete()
    await db.from('sojalink_attempts').delete()
    await db.from('sojalink_entity_correlations').delete()
    await db.from('sojalink_events').delete()
    await db.from('sojalink_rule_versions').delete()
    await db.from('sojalink_rules').delete()
    await db.from('sojalink_event_types').delete()

    await db.table('sojalink_event_types').insert(data.eventType)
    await db.table('sojalink_rules').insert(data.rule)
    await db.table('sojalink_rule_versions').insert(data.ruleVersion)
    await db.table('sojalink_events').insert(data.event)
    await db.table('sojalink_attempts').insert(data.attempt)
    await db.table('sojalink_step_logs').insert(data.stepLog)
    await db.table('sojalink_entity_correlations').insert(data.entityCorrelation)
  })

  //Les tests suivants vérifient que la base de données refuse d'insérer des données incohérentes
  test('Foreign key event_type_id from sojalink_rules is correct', async ({ assert }) => {
    await assert.rejects(() =>
      db.table('sojalink_rules').insert({ ...data.rule, event_type_id: 9999 })
    )
  })

  test('Foreign key rule_id from sojalink_rule_verisons is correct', async ({ assert }) => {
    await assert.rejects(() =>
      db.table('sojalink_rules_versions').insert({ ...data.ruleVersion, rule_id: 9999 })
    )
  })

  test('Foreign key event_type_id from sojalink_events is correct', async ({ assert }) => {
    await assert.rejects(() =>
      db.table('sojalink_events').insert({ ...data.event, event_type_id: 9999 })
    )
  })

  test('Foreign key applied_rule_version_id from sojalink_events is correct', async ({
    assert,
  }) => {
    await assert.rejects(() =>
      db.table('sojalink_events').insert({ ...data.event, applied_rule_version_id: 9999 })
    )
  })

  test('Foreign key event_id from sojalink_attempts is correct', async ({ assert }) => {
    await assert.rejects(() =>
      db.table('sojalink_attempts').insert({ ...data.attempt, event_id: 9999 })
    )
  })

  test('Foreign key attempt_id from sojalink_step_logs is correct', async ({ assert }) => {
    await assert.rejects(() => db.table('sojalink_step_logs').insert({ attempt_id: 9999 }))
  })

  test('Foreign key created_by_event_id from sojalink_entity_correlations is correct', async ({
    assert,
  }) => {
    await assert.rejects(() =>
      db
        .table('sojalink_entity_correlations')
        .insert({ ...data.entityCorrelation, created_by_event_id: 9999 })
    )
  })
})
