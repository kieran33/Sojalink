import { BaseSeeder } from '@adonisjs/lucid/seeders'
import {
  ensureScenarioGraph,
  insertPendingEvent,
  printExpectation,
} from '#database/support/scenario_helpers'

/**
 * Scenario 3 — multi-step pipeline with chained outputs.
 * Step 2 consumes the output of step 1 ({{ steps.notify_team.sent }}).
 *
 * Run while the worker is up:
 *   node ace db:seed --files "database/seeders/scenarios/scenario_3_multi_step_seeder.ts"
 */
export default class Scenario3MultiStepSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    const { eventType } = await ensureScenarioGraph({
      eventTypeCode: 'scenario.multi_step',
      ruleCode: 'scenario-multi-step',
      conditions: { op: 'eq', field: 'sourceApp', value: 'SojadisPro' },
      pipeline: {
        steps: [
          {
            key: 'notify_team',
            handler: 'email_notification',
            input: { message: 'Event {{ event.id }}: {{ event.payload.name }}' },
          },
          {
            key: 'notify_manager',
            handler: 'email_notification',
            input: {
              previous_sent: '{{ steps.notify_team.sent }}',
              app: '{{ event.sourceApp }}',
            },
          },
        ],
      },
    })

    const event = await insertPendingEvent({
      eventTypeId: eventType.id,
      sourceApp: 'SojadisPro',
      payload: { name: 'commande multi-steps' },
    })

    printExpectation(event.id, [
      'event.status = processed, attempt.status = success',
      'two step logs in success, ordered by step_index (notify_team then notify_manager)',
      'notify_manager input contains the output of notify_team: {"previous_sent": true, "app": "SojadisPro"}',
    ])
  }
}
