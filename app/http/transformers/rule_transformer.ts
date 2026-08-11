import { BaseTransformer } from '@adonisjs/core/transformers'
import type SojalinkRule from '#models/sojalink_rule'
import type SojalinkRuleVersion from '#models/sojalink_rule_version'
import EventTypeTransformer from '#transformers/event_type_transformer'
import EventTransformer from '#transformers/event_transformer'
import RuleVersionTransformer from '#transformers/rule_version_transformer'

export function selectDisplayedVersion(versions: SojalinkRuleVersion[]) {
  return versions.find((version) => version.isActive) ?? versions[0]
}

const RECENT_EVENTS_LIMIT = 3

export function selectRecentEvents(versions: SojalinkRuleVersion[], limit = RECENT_EVENTS_LIMIT) {
  return versions
    .flatMap((version) => version.appliedEvents)
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
    .slice(0, limit)
}

export default class RuleTransformer extends BaseTransformer<SojalinkRule> {
  toObject() {
    const displayedVersion = selectDisplayedVersion(this.resource.versions)
    const recentEvents = selectRecentEvents(this.resource.versions)

    return {
      ...this.pick(this.resource, ['id', 'code', 'label', 'priority', 'isActive']),
      eventType: EventTypeTransformer.transform(this.resource.eventType),
      displayedVersion: RuleVersionTransformer.transform(displayedVersion ?? null),
      recentEvents: EventTransformer.transform(recentEvents),
    }
  }

  forShowPage() {
    return {
      ...this.toObject(),
      versions: RuleVersionTransformer.transform(this.resource.versions)
        .useVariant('forDetailedView')
        .depth(4),
    }
  }
}
