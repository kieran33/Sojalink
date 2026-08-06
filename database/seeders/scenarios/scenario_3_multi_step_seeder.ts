import { BaseSeeder } from '@adonisjs/lucid/seeders'
import SojalinkEventType from '#models/sojalink_event_type'
import SojalinkRule from '#models/sojalink_rule'
import SojalinkRuleVersion from '#models/sojalink_rule_version'
import SojalinkEvent from '#models/sojalink_event'

export default class Scenario3MultiStepSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    const eventType = await SojalinkEventType.updateOrCreate(
      { code: 'scenario.multi_step' },
      { code: 'scenario.multi_step', label: 'Scenario multi step', isActive: true }
    )

    const rule = await SojalinkRule.updateOrCreate(
      { code: 'scenario-multi-step' },
      {
        code: 'scenario-multi-step',
        label: 'Scenario multi step',
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
        }),
      }
    )

    await SojalinkEvent.create({
      eventTypeId: eventType.id,
      sourceApp: 'SojadisPro',
      sourceEntityType: 'scenario',
      sourceEntityId: Math.floor(Date.now() / 1000),
      status: 'pending',
      payloadJson: JSON.stringify({ name: 'commande multi-steps' }),
    })

    console.log('Seeder appliqué avec succès.')
  }
}
