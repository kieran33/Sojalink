import { BaseSeeder } from '@adonisjs/lucid/seeders'
import SojalinkEventType from '#models/sojalink_event_type'
import SojalinkRule from '#models/sojalink_rule'
import SojalinkRuleVersion from '#models/sojalink_rule_version'
import SojalinkEvent from '#models/sojalink_event'

export default class Scenario5InvalidPipelineSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    const eventType = await SojalinkEventType.updateOrCreate(
      { code: 'scenario.invalid_pipeline' },
      { code: 'scenario.invalid_pipeline', label: 'Scenario invalid pipeline', isActive: true }
    )

    const rule = await SojalinkRule.updateOrCreate(
      { code: 'scenario-invalid-pipeline' },
      {
        code: 'scenario-invalid-pipeline',
        label: 'Scenario invalid pipeline',
        eventTypeId: eventType.id,
        priority: 5,
        isActive: true,
      }
    )

    await SojalinkRuleVersion.updateOrCreate(
      { ruleId: rule.id, versionNumber: 1 },
      {
        ruleId: rule.id,
        versionNumber: 1,
        isActive: true,
        conditionsJson: JSON.stringify({ op: 'eq', field: 'sourceApp', value: 'SojadisPro' }),
        pipelineJson: JSON.stringify({
          steps: [
            { key: 'first_step', handler: 'unknown_handler' },
            { key: 'second_step', handler: 'email_notification' },
          ],
        }),
      }
    )

    await SojalinkEvent.create({
      eventTypeId: eventType.id,
      sourceApp: 'SojadisPro',
      sourceEntityType: 'scenario',
      sourceEntityId: 5,
      status: 'pending',
      payloadJson: JSON.stringify({ name: 'pipeline invalide' }),
    })

    console.log('Seeder appliqué avec succès.')
  }
}
