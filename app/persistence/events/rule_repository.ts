// app/persistence/events/rule_repository.ts
import SojalinkEvent from '#models/sojalink_event'
import SojalinkRule from '#models/sojalink_rule'
import SojalinkRuleVersion from '#models/sojalink_rule_version'

export class RuleRepository {
  async findProcessingEvent(eventId: number) {
    return SojalinkEvent.query().where('id', eventId).where('status', 'processing').first()
  }

  async findActiveRulesWithActiveVersions(eventTypeId: number) {
    const rules = await SojalinkRule.query()
      .where('eventTypeId', eventTypeId)
      .where('isActive', true)
      .orderBy('priority', 'asc')

    return Promise.all(
      rules.map(async (rule) => {
        const versions = await SojalinkRuleVersion.query()
          .where('ruleId', rule.id)
          .where('isActive', true)
          .orderBy('versionNumber', 'desc')

        return {
          id: rule.id,
          code: rule.code,
          label: rule.label,
          priority: rule.priority,
          versions,
        }
      })
    )
  }

  async saveResolution(eventId: number, ruleVersionId: number, snapshot: unknown) {
    await SojalinkEvent.query()
      .where('id', eventId)
      .update({
        appliedRuleVersionId: ruleVersionId,
        resolutionSnapshotJson: JSON.stringify(snapshot),
      })
  }
}
