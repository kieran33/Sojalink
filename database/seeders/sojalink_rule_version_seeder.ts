import { BaseSeeder } from '@adonisjs/lucid/seeders'
import SojalinkRuleVersion from '#models/sojalink_rule_version'
import SojalinkRule from '#models/sojalink_rule'

export default class SojalinkRuleVersionSeeder extends BaseSeeder {
  async run() {
    const rule = await SojalinkRule.findByOrFail('code', 'sojadispro-order-to-toki-task')

    await SojalinkRuleVersion.updateOrCreateMany(
      ['ruleId', 'versionNumber'],
      [
        {
          ruleId: rule.id,
          versionNumber: 1,
          isActive: true,
          conditionsJson: JSON.stringify({
            op: 'eq',
            field: 'sourceApp',
            value: 'SojadisPro',
          }),
          pipelineJson: JSON.stringify({
            steps: [
              {
                key: 'notify_team',
                handler: 'email_notification',
                input: {
                  message: 'New event {{ event.id }} received from {{ event.sourceApp }}',
                },
              },
            ],
          }),
        },
      ]
    )
  }
}
