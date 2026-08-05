import { BaseSeeder } from '@adonisjs/lucid/seeders'
import SojalinkEventType from '#models/sojalink_event_type'
import SojalinkRule from '#models/sojalink_rule'
import SojalinkRuleVersion from '#models/sojalink_rule_version'
import SojalinkEvent from '#models/sojalink_event'

export default class Scenario2NoMatchingRuleSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    const eventType = await SojalinkEventType.updateOrCreate(
      { code: 'scenario.no_matching_rule' },
      { code: 'scenario.no_matching_rule', label: 'Scenario no matching rule', isActive: true }
    )

    const rule = await SojalinkRule.updateOrCreate(
      { code: 'scenario-no-matching-rule' },
      {
        code: 'scenario-no-matching-rule',
        label: 'Scenario no matching rule',
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
          steps: [{ key: 'notify_team', handler: 'email_notification' }],
        }),
      }
    )

    await SojalinkEvent.create({
      eventTypeId: eventType.id,
      sourceApp: 'UnknownApp',
      sourceEntityType: 'scenario',
      sourceEntityId: 2,
      status: 'pending',
      payloadJson: JSON.stringify({ name: 'event orphelin' }),
    })

    console.log('Seeder appliqué avec succès.')
  }
}
