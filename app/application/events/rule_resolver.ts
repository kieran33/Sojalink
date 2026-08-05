import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import type { ProcessingEvent } from '#domain/events/event'
import {
  MultipleMatchingRulesError,
  NoMatchingRuleError,
  RuleResolutionError,
} from '#domain/events/errors'
import { evaluateRuleConditions } from '#application/events/evaluate_rule_conditions'
import { EventRepository } from '#persistence/events/event_repository'
import { RuleRepository } from '#persistence/events/rule_repository'

export type RuleResolution = {
  ruleVersionId: number
}

@inject()
export class RuleResolver {
  constructor(
    private ruleRepository: RuleRepository,
    private eventRepository: EventRepository
  ) {}

  async resolve(event: ProcessingEvent): Promise<RuleResolution> {
    const rules = await this.ruleRepository.findActiveRulesWithLatestActiveVersion(
      event.eventTypeId
    )

    const conditionsContext = {
      sourceApp: event.sourceApp,
      sourceEntityType: event.sourceEntityType,
      sourceEntityId: event.sourceEntityId,
      payload: event.payload,
    }

    const matchingRules = rules.filter((rule) =>
      evaluateRuleConditions(rule.version.conditions, conditionsContext)
    )

    if (matchingRules.length === 0) {
      return this.fail(event, new NoMatchingRuleError(`No rule matches event ${event.id}`))
    }

    const bestPriority = Math.min(...matchingRules.map((rule) => rule.priority))
    const winners = matchingRules.filter((rule) => rule.priority === bestPriority)

    if (winners.length > 1) {
      return this.fail(
        event,
        new MultipleMatchingRulesError(
          `${winners.length} rules match event ${event.id} with priority ${bestPriority}`
        )
      )
    }

    const winner = winners[0]

    await this.eventRepository.saveResolution(event.id, winner.version.id, {
      ruleId: winner.id,
      ruleCode: winner.code,
      ruleVersionId: winner.version.id,
      priority: winner.priority,
      resolvedAt: DateTime.utc().toISO(),
    })

    logger.info({ eventId: event.id, ruleVersionId: winner.version.id }, 'Rule resolved')

    return { ruleVersionId: winner.version.id }
  }

  private async fail(event: ProcessingEvent, error: RuleResolutionError): Promise<never> {
    await this.eventRepository.saveResolutionFailure(event.id, error.name, error.message)

    logger.warn({ eventId: event.id, errorCode: error.name }, error.message)

    throw error
  }
}
