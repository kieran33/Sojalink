import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RuleRepository } from '#persistence/events/rule_repository'
import { evaluateRuleConditions } from '#application/events/evaluate_rule_conditions'

@inject()
export class RuleResolver {
  constructor(private ruleRepository: RuleRepository) {}

  async resolve(eventId: number): Promise<void> {
    const event = await this.ruleRepository.findProcessingEvent(eventId)

    if (!event) {
      throw new Error(`Event ${eventId} is not processing`)
    }

    const rules = await this.ruleRepository.findActiveRulesWithActiveVersions(event.eventTypeId)
    const payload = JSON.parse(event.payloadJson)

    const matchingVersions = []

    for (const rule of rules) {
      for (const version of rule.versions) {
        const conditions = JSON.parse(version.conditionsJson)

        const isMatching = evaluateRuleConditions(conditions, {
          sourceApp: event.sourceApp,
          sourceEntityType: event.sourceEntityType,
          sourceEntityId: event.sourceEntityId,
          payload,
        })

        if (isMatching) {
          matchingVersions.push({ rule, version })
        }
      }
    }

    if (matchingVersions.length === 0) {
      logger.warn({ eventId }, 'No rule found')
      throw new Error(`No rule found for event ${eventId}`)
    }

    const bestPriority = Math.min(...matchingVersions.map((match) => match.rule.priority))
    const winners = matchingVersions.filter((match) => match.rule.priority === bestPriority)

    if (winners.length > 1) {
      logger.error({ eventId }, 'Several rules found')
      throw new Error(`Several rules found for event ${eventId}`)
    }

    const winner = winners[0]

    await this.ruleRepository.saveResolution(event.id, winner.version.id, {
      ruleId: winner.rule.id,
      ruleCode: winner.rule.code,
      ruleVersionId: winner.version.id,
      priority: winner.rule.priority,
      resolvedAt: new Date().toISOString(),
    })

    logger.info({ eventId, ruleVersionId: winner.version.id }, 'Rule resolved')
  }
}
