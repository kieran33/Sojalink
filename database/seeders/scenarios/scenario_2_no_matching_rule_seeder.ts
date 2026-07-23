import { BaseSeeder } from '@adonisjs/lucid/seeders'
import {
  ensureScenarioGraph,
  insertPendingEvent,
  printExpectation,
} from '#database/support/scenario_helpers'

/**
 * Scenario 2 — no matching rule.
 * The rule only matches sourceApp = SojadisPro; the event comes from
 * another app. The event must fail with a traced resolution error and
 * the worker must keep running.
 *
 * Run while the worker is up:
 *   node ace db:seed --files "database/seeders/scenarios/scenario_2_no_matching_rule_seeder.ts"
 */
export default class Scenario2NoMatchingRuleSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    const { eventType } = await ensureScenarioGraph({
      eventTypeCode: 'scenario.no_matching_rule',
      ruleCode: 'scenario-no-matching-rule',
      conditions: { op: 'eq', field: 'sourceApp', value: 'SojadisPro' },
      pipeline: {
        steps: [{ key: 'notify_team', handler: 'email_notification' }],
      },
    })

    const event = await insertPendingEvent({
      eventTypeId: eventType.id,
      sourceApp: 'UnknownApp',
      payload: { name: 'event orphelin' },
    })

    printExpectation(event.id, [
      'event.status = failed (failed_at set)',
      'event.resolution_error_code = NoMatchingRuleError',
      'no attempt row (the pipeline never started)',
      'the worker keeps polling afterwards',
    ])
  }
}
