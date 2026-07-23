import { BaseSeeder } from '@adonisjs/lucid/seeders'
import {
  ensureScenarioGraph,
  insertPendingEvent,
  printExpectation,
} from '#database/support/scenario_helpers'

/**
 * Scenario 5 — invalid pipeline rejected before execution.
 * The pipeline references a handler that is not registered: validation
 * fails the attempt before the first step, so no step log is written.
 *
 * Run while the worker is up:
 *   node ace db:seed --files "database/seeders/scenarios/scenario_5_invalid_pipeline_seeder.ts"
 */
export default class Scenario5InvalidPipelineSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    const { eventType } = await ensureScenarioGraph({
      eventTypeCode: 'scenario.invalid_pipeline',
      ruleCode: 'scenario-invalid-pipeline',
      conditions: { op: 'eq', field: 'sourceApp', value: 'SojadisPro' },
      pipeline: {
        steps: [
          { key: 'first_step', handler: 'unknown_handler' },
          { key: 'second_step', handler: 'email_notification' },
        ],
      },
    })

    const event = await insertPendingEvent({
      eventTypeId: eventType.id,
      sourceApp: 'SojadisPro',
      payload: { name: 'pipeline invalide' },
    })

    printExpectation(event.id, [
      'event.status = failed',
      'attempt.status = failed with error_code = PipelineValidationError',
      'zero step logs (the pipeline was rejected before the first step)',
    ])
  }
}
