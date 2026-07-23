import { BaseSeeder } from '@adonisjs/lucid/seeders'
import {
  ensureScenarioGraph,
  insertPendingEvent,
  printExpectation,
} from '#database/support/scenario_helpers'

/**
 * Scenario 1 — nominal flow.
 * One matching rule, one-step pipeline with template input.
 *
 * Run while the worker is up:
 *   node ace db:seed --files "database/seeders/scenarios/scenario_1_nominal_seeder.ts"
 */
export default class Scenario1NominalSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    const { eventType } = await ensureScenarioGraph({
      eventTypeCode: 'scenario.nominal',
      ruleCode: 'scenario-nominal',
      conditions: { op: 'eq', field: 'sourceApp', value: 'SojadisPro' },
      pipeline: {
        steps: [
          {
            key: 'notify_team',
            handler: 'email_notification',
            input: { message: 'Event {{ event.id }}: {{ event.payload.name }}' },
          },
        ],
      },
    })

    const event = await insertPendingEvent({
      eventTypeId: eventType.id,
      sourceApp: 'SojadisPro',
      payload: { name: 'commande nominale' },
    })

    printExpectation(event.id, [
      'event.status = processed (resolved_at and processed_at set)',
      'attempt.status = success',
      'one step log "notify_team" in success, input resolved (no more {{ }})',
    ])
  }
}
