// app/persistence/events/rule_repository.ts
import SojalinkEvent from '#models/sojalink_event'
import SojalinkRule from '#models/sojalink_rule'
import SojalinkRuleVersion from '#models/sojalink_rule_version'
import type { ProcessingEvent } from '#domain/events/event'

export class RuleRepository {
  async findProcessingEvent(eventId: number): Promise<ProcessingEvent | null> {
    const event = await SojalinkEvent.query()
      .where('id', eventId)
      .where('status', 'processing')
      .first()

    if (!event) return null

    return this.toProcessingEvent(event)
  }

  private toProcessingEvent(event: SojalinkEvent): ProcessingEvent {
    if (!event.processingStartedAt) {
      throw new Error('Expected processingStartedAt to be defined')
    }

    return {
      id: event.id,
      status: 'processing',
      eventTypeId: event.eventTypeId,
      sourceApp: event.sourceApp,
      sourceEntityType: event.sourceEntityType,
      sourceEntityId: event.sourceEntityId,
      payloadJson: event.payloadJson,
      createdAt: event.createdAt,
      processingStartedAt: event.processingStartedAt,
      appliedRuleVersionId: event.appliedRuleVersionId,
    }
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
