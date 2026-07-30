import { BaseTransformer } from '@adonisjs/core/transformers'
import type SojalinkRule from '#models/sojalink_rule'
import type SojalinkRuleVersion from '#models/sojalink_rule_version'
import EventTypeTransformer from '#transformers/event_type_transformer'
import RuleVersionTransformer from '#transformers/rule_version_transformer'

export function selectDisplayedVersion(versions: SojalinkRuleVersion[]) {
  return versions.find((version) => version.isActive) ?? versions[0]
}

export default class RuleTransformer extends BaseTransformer<SojalinkRule> {
  /**
   * Variante légère : liste du dashboard
   */
  toObject() {
    const displayedVersion = selectDisplayedVersion(this.resource.versions)

    return {
      ...this.pick(this.resource, ['id', 'code', 'label', 'priority', 'isActive']),
      eventType: EventTypeTransformer.transform(this.resource.eventType),
      displayedVersion: RuleVersionTransformer.transform(displayedVersion ?? null),
    }
  }

  /**
   * Variante détaillée : page d'une règle, historique complet
   */
  forShowPage() {
    return {
      ...this.toObject(),
      versions: RuleVersionTransformer.transform(this.resource.versions)
        .useVariant('forDetailedView')
        .depth(4),
    }
  }
}
