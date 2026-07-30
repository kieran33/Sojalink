import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { seedEventGraph } from '#tests/helpers/event_graph_factory'
import GetRuleDetails from '#http/actions/rules/get_rule_details'

test.group('GetRuleDetails', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('returns every version of a rule, ordered by version number desc', async ({ assert }) => {
    const { ruleId, ruleVersionId } = await seedEventGraph()

    const newVersionId = await db.table('sojalink_rule_versions').insert({
      rule_id: ruleId,
      version_number: 2,
      is_active: true,
      conditions_json: JSON.stringify({ op: 'eq', field: 'sourceApp', value: 'x' }),
      pipeline_json: JSON.stringify({ steps: [] }),
    })
    await db.from('sojalink_rule_versions').where('id', ruleVersionId).update({ is_active: false })

    const rule = await GetRuleDetails.handle(ruleId)

    assert.lengthOf(rule.versions, 2)
    assert.equal(rule.versions[0].id, newVersionId[0])
    assert.equal(rule.versions[0].versionNumber, 2)
    assert.equal(rule.versions[0].isActive, true)
    assert.equal(rule.versions[1].versionNumber, 1)
    assert.equal(rule.versions[1].isActive, false)
  })

  test('returns an empty event list for a version with no event', async ({ assert }) => {
    const { ruleId } = await seedEventGraph()

    const rule = await GetRuleDetails.handle(ruleId)

    assert.lengthOf(rule.versions, 1)
    assert.deepEqual(rule.versions[0].appliedEvents, [])
  })

  test('excludes an unresolved event (applied_rule_version_id null) from every version', async ({
    assert,
  }) => {
    const { ruleId, eventTypeId } = await seedEventGraph()

    await db.table('sojalink_events').insert({
      event_type_id: eventTypeId,
      source_app: 'sojadispro',
      source_entity_type: 'worksheet',
      source_entity_id: 1,
      status: 'failed',
      payload_json: JSON.stringify({}),
      applied_rule_version_id: null,
      resolution_error_code: 'NoMatchingRuleError',
      resolution_error_message: 'No rule matches',
    })

    const rule = await GetRuleDetails.handle(ruleId)

    assert.deepEqual(rule.versions[0].appliedEvents, [])
  })

  test('surfaces a failed attempt and its step logs on a resolved event', async ({ assert }) => {
    const { ruleId, eventTypeId, ruleVersionId } = await seedEventGraph()

    const eventId = await db.table('sojalink_events').insert({
      event_type_id: eventTypeId,
      source_app: 'sojadispro',
      source_entity_type: 'worksheet',
      source_entity_id: 2,
      status: 'failed',
      payload_json: JSON.stringify({}),
      applied_rule_version_id: ruleVersionId,
    })

    const attemptId = await db.table('sojalink_attempts').insert({
      event_id: eventId[0],
      attempt_number: 1,
      status: 'failed',
      error_code: 'StepExecutionError',
      error_message: 'Handler threw',
    })

    await db.table('sojalink_step_logs').insert({
      attempt_id: attemptId[0],
      step_index: 0,
      step_code: 'notify_team',
      handler_name: 'email_notification',
      status: 'failed',
      input_json: JSON.stringify({}),
      error_code: 'HandlerError',
      error_message: 'SMTP timeout',
    })

    const rule = await GetRuleDetails.handle(ruleId)

    const [event] = rule.versions[0].appliedEvents
    assert.exists(event)

    const [attempt] = event.attempts
    assert.equal(attempt.status, 'failed')
    assert.equal(attempt.errorCode, 'StepExecutionError')

    const [stepLog] = attempt.stepLogs
    assert.equal(stepLog.status, 'failed')
    assert.equal(stepLog.errorCode, 'HandlerError')
  })

  test('rejects when the rule does not exist', async ({ assert }) => {
    await assert.rejects(() => GetRuleDetails.handle(999999))
  })
})
