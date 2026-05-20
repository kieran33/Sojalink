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
        conditionsJson: JSON.stringify({ id: 1, name: 'test' }),
        pipelineJson: JSON.stringify({ id: 1, name: 'test' }),
      },
    ])
  }
}
