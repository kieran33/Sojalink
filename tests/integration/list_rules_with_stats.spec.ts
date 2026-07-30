import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { seedEventGraph } from '#tests/helpers/event_graph_factory'
import ListRulesWithStats from '#http/actions/dashboard/list_rules_with_stats'

test.group('ListRulesWithStats', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('counts total and active rules', async ({ assert }) => {
    const { eventTypeId } = await seedEventGraph()

    await db.table('sojalink_rules').insert({
      event_type_id: eventTypeId,
      code: 'inactive-rule',
      label: 'Inactive rule',
      priority: 10,
      is_active: false,
    })

    const { stats } = await ListRulesWithStats.handle()

    assert.equal(stats.totalRules, 2)
    assert.equal(stats.activeRules, 1)
  })

  test('only counts processed/failed events inside the last 24h', async ({ assert }) => {
    const { eventTypeId } = await seedEventGraph()

    const insertEvent = (attrs: Record<string, unknown>) =>
      db.table('sojalink_events').insert({
        event_type_id: eventTypeId,
        source_app: 'sojadispro',
        source_entity_type: 'worksheet',
        source_entity_id: Math.floor(Math.random() * 100000),
        payload_json: JSON.stringify({}),
        ...attrs,
      })

    await insertEvent({
      status: 'processed',
      processed_at: DateTime.utc().minus({ hours: 1 }).toSQL({ includeOffset: false }),
    })
    await insertEvent({
      status: 'processed',
      processed_at: DateTime.utc().minus({ hours: 30 }).toSQL({ includeOffset: false }),
    })
    await insertEvent({
      status: 'failed',
      failed_at: DateTime.utc().minus({ hours: 2 }).toSQL({ includeOffset: false }),
    })
    await insertEvent({
      status: 'failed',
      failed_at: DateTime.utc().minus({ hours: 48 }).toSQL({ includeOffset: false }),
    })

    const { stats } = await ListRulesWithStats.handle()

    assert.equal(stats.processedLast24h, 1)
    assert.equal(stats.failedLast24h, 1)
  })
})
