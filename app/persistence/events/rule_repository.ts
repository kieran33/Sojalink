import SojalinkRule from '#models/sojalink_rule'
import type { ResolvableRule } from '#domain/events/rule'
import { InvalidJsonError } from '#domain/events/errors'

export class RuleRepository {
  /**
   * Loads the active rules of an event type, each with its latest active
   * version (highest version_number). Rules without an active version are
   * excluded. Ordered by priority (lowest number first).
   */
  async findActiveRulesWithLatestActiveVersion(eventTypeId: number): Promise<ResolvableRule[]> {
    const rules = await SojalinkRule.query()
      .where('eventTypeId', eventTypeId)
      .where('isActive', true)
      .preload('versions', (query) => {
        query.where('isActive', true).orderBy('versionNumber', 'desc')
      })
      .orderBy('priority', 'asc')

    return rules
      .filter((rule) => rule.versions.length > 0)
      .map((rule) => {
        const latestVersion = rule.versions[0]

        return {
          id: rule.id,
          code: rule.code,
          label: rule.label,
          priority: rule.priority,
          version: {
            id: latestVersion.id,
            versionNumber: latestVersion.versionNumber,
            conditions: this.parseConditions(rule.code, latestVersion.conditionsJson),
          },
        }
      })
  }

  private parseConditions(ruleCode: string, conditionsJson: string): unknown {
    try {
      return JSON.parse(conditionsJson)
    } catch {
      throw new InvalidJsonError(`Rule "${ruleCode}" has an invalid conditions_json`)
    }
  }
}
