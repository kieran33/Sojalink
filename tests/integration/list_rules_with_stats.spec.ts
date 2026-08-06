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

  test('preloads each rule version applied events ordered by most recent first', async ({
    assert,
  }) => {
    const { eventTypeId, ruleId, ruleVersionId } = await seedEventGraph()

    const insertEvent = (sourceEntityId: number, hoursAgo: number) =>
      db.table('sojalink_events').insert({
        event_type_id: eventTypeId,
        source_app: 'sojadispro',
        source_entity_type: 'worksheet',
        source_entity_id: sourceEntityId,
        status: 'processed',
        payload_json: JSON.stringify({}),
        applied_rule_version_id: ruleVersionId,
        created_at: DateTime.utc().minus({ hours: hoursAgo }).toSQL({ includeOffset: false }),
      })

    await insertEvent(1, 5)
    await insertEvent(2, 1)

    const { rules } = await ListRulesWithStats.handle()
    const rule = rules.find((candidate) => candidate.id === ruleId)

    assert.exists(rule)
    const [version] = rule!.versions
    assert.equal(version.appliedEvents[0].sourceEntityId, 2)
    assert.equal(version.appliedEvents[1].sourceEntityId, 1)
  })

  test('paginates the rule list while keeping stats computed over every rule', async ({
    assert,
  }) => {
    const { eventTypeId } = await seedEventGraph()

    for (let index = 0; index < 3; index++) {
      await db.table('sojalink_rules').insert({
        event_type_id: eventTypeId,
        code: `extra-rule-${index}`,
        label: `Extra rule ${index}`,
        priority: 20 + index,
        is_active: true,
      })
    }

    const firstPage = await ListRulesWithStats.handle(1, 2)

    assert.lengthOf(firstPage.rules, 2)
    assert.equal(firstPage.pagination.page, 1)
    assert.equal(firstPage.pagination.perPage, 2)
    assert.equal(firstPage.pagination.total, 4)
    assert.equal(firstPage.pagination.lastPage, 2)
    assert.equal(firstPage.stats.totalRules, 4)
    assert.equal(firstPage.stats.activeRules, 4)

    const secondPage = await ListRulesWithStats.handle(2, 2)

    assert.lengthOf(secondPage.rules, 2)
    assert.equal(secondPage.pagination.page, 2)
    assert.equal(secondPage.stats.totalRules, 4)
  })
})
