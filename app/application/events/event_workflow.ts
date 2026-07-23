import { inject } from '@adonisjs/core'
import type { ProcessingEvent } from '#domain/events/event'
import { RuleResolver } from '#application/events/rule_resolver'
import { EventExecutor } from '#application/events/event_executor'

/**
 * Full processing of one reserved event: resolution then execution.
 * Any error bubbles up to the EventProcessor, which marks the event failed.
 */
@inject()
export class EventWorkflow {
  constructor(
    private ruleResolver: RuleResolver,
    private eventExecutor: EventExecutor
  ) {}

  async run(event: ProcessingEvent): Promise<void> {
    const resolution = await this.ruleResolver.resolve(event)

    await this.eventExecutor.execute({
      ...event,
      appliedRuleVersionId: resolution.ruleVersionId,
    })
  }
}
