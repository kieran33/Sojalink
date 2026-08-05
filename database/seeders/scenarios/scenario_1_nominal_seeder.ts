import { BaseSeeder } from '@adonisjs/lucid/seeders'
import SojalinkEventType from '#models/sojalink_event_type'
import SojalinkRule from '#models/sojalink_rule'
import SojalinkRuleVersion from '#models/sojalink_rule_version'
import SojalinkEvent from '#models/sojalink_event'

export default class Scenario1NominalSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    const eventType = await SojalinkEventType.updateOrCreate(
      { code: 'scenario.nominal' },
      { code: 'scenario.nominal', label: 'Scenario nominal', isActive: true }
    )

    const rule = await SojalinkRule.updateOrCreate(
      { code: 'scenario-nominal' },
      {
        code: 'scenario-nominal',
        label: 'Scenario nominal',
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
            {
              key: 'notify_team',
              handler: 'email_notification',
              input: { message: 'Event {{ event.id }}' },
            },
          ],
        }),
      }
    )

    await SojalinkEvent.create({
      eventTypeId: eventType.id,
      sourceApp: 'SojadisPro',
      sourceEntityType: 'scenario',
      sourceEntityId: 1,
      status: 'pending',
      payloadJson: JSON.stringify({ name: 'commande nominale' }),
    })

    console.log('Seeder appliqué avec succès.')
  }
}
