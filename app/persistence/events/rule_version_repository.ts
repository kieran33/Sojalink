import SojalinkRuleVersion from '#models/sojalink_rule_version'
import type { RuleVersion } from '#domain/events/rule_version'

export class RuleVersionRepository {
  async findById(ruleVersionId: number): Promise<RuleVersion | null> {
    const ruleVersion = await SojalinkRuleVersion.find(ruleVersionId)

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
