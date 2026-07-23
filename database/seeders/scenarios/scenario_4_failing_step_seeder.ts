import { BaseSeeder } from '@adonisjs/lucid/seeders'
import {
  ensureScenarioGraph,
  insertPendingEvent,
  printExpectation,
} from '#database/support/scenario_helpers'

/**
 * Scenario 4 — failing step (unresolvable input).
 * The pipeline references {{ event.payload.name }} but the event payload
 * has no "name" field: the first step fails, the second never runs.
 *
 * Run while the worker is up:
 *   node ace db:seed --files "database/seeders/scenarios/scenario_4_failing_step_seeder.ts"
 */
export default class Scenario4FailingStepSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    const { eventType } = await ensureScenarioGraph({
      eventTypeCode: 'scenario.failing_step',
      ruleCode: 'scenario-failing-step',
      conditions: { op: 'eq', field: 'sourceApp', value: 'SojadisPro' },
      pipeline: {
        steps: [
          {
            key: 'notify_team',
            handler: 'email_notification',
            input: { message: 'Event {{ event.id }}: {{ event.payload.name }}' },
          },
          { key: 'notify_manager', handler: 'email_notification' },
        ],
      },
    })

    const event = await insertPendingEvent({
      eventTypeId: eventType.id,
      sourceApp: 'SojadisPro',
      payload: { id: 42 }, // no "name" field on purpose
    })

    printExpectation(event.id, [
      'event.status = failed',
      'attempt.status = failed with error_code = InputResolutionError',
      'exactly one step log (notify_team) in failed, with the error message',
      'notify_manager was never executed (stop at first failure)',
    ])
  }
}
