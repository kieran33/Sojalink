import { BaseSeeder } from '@adonisjs/lucid/seeders'
import SojalinkRuleVersion from '#models/sojalink_rule_version'
import SojalinkRule from '#models/sojalink_rule'

export default class SojalinkRuleVersionSeeder extends BaseSeeder {
  async run() {
    const rule = await SojalinkRule.query().orderBy('id', 'desc').firstOrFail()

    await SojalinkRuleVersion.updateOrCreateMany('ruleId', [
      {
        ruleId: rule.id,
        versionNumber: 1,
        isActive: true,
        conditionsJson: JSON.stringify([
          {
            conditions: [{ field: 'source_app', operator: 'eq', value: 'SojadisPro' }],
          },
          {
            conditions: [{ field: 'source_app', operator: 'eq', value: `Toki` }],
          },
        ]),
        pipelineJson: JSON.stringify({
          steps: [
            { key: 'step-1', handler: 'create_toki_task' },
            { key: 'step-2', handler: 'send_notification' },
          ],
        }),
      },
    ])
  }
}
