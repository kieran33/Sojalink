import { BaseSeeder } from '@adonisjs/lucid/seeders'
import SojalinkEventType from '#models/sojalink_event_type'
import SojalinkRule from '#models/sojalink_rule'
import SojalinkRuleVersion from '#models/sojalink_rule_version'
import SojalinkEvent from '#models/sojalink_event'

export default class Scenario4FailingStepSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    const eventType = await SojalinkEventType.updateOrCreate(
      { code: 'scenario.failing_step' },
      { code: 'scenario.failing_step', label: 'Scenario failing step', isActive: true }
    )

    const rule = await SojalinkRule.updateOrCreate(
      { code: 'scenario-failing-step' },
      {
        code: 'scenario-failing-step',
        label: 'Scenario failing step',
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
            { key: 'notify_manager', handler: 'email_notification' },
          ],
        }),
      }
    )

    await SojalinkEvent.create({
      eventTypeId: eventType.id,
      sourceApp: 'SojadisPro',
      sourceEntityType: 'scenario',
      sourceEntityId: 4,
      status: 'pending',
      payloadJson: JSON.stringify({ id: 42 }),
    })

    console.log('Seeder appliqué avec succès.')
  }
}
