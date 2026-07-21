import type { RuleVersion } from '#domain/events/rule_version'
import SojalinkRuleVersion from '#models/sojalink_rule_version'

export class RuleVersionRepository {
  async findPipelineByRuleVersion(ruleVersionId: number): Promise<RuleVersion | null> {
    const ruleVersion = await SojalinkRuleVersion.query()
      .where('id', ruleVersionId)
      .whereNotNull('pipeline_json')
      .where('pipeline_json', '!=', '')
      .first()

    if (!ruleVersion) {
      return null
    }

    return this.toRuleVersion(ruleVersion)
  }

  private toRuleVersion(ruleVersion: SojalinkRuleVersion): RuleVersion {
    return {
      id: ruleVersion.id,
      ruleId: ruleVersion.ruleId,
      versionNumber: ruleVersion.versionNumber,
      isActive: ruleVersion.isActive,
      conditionsJson: ruleVersion.conditionsJson,
      pipelineJson: ruleVersion.pipelineJson,
      createdAt: ruleVersion.createdAt,
      updatedAt: ruleVersion.updatedAt,
    }
  }
}
