import { inject } from '@adonisjs/core'
import type { ProcessingEvent } from '#domain/events/event'
import { RuleResolver } from '#application/events/rule_resolver'

@inject()
export class EventWorkflow {
  constructor(private ruleResolver: RuleResolver) {}

  async run(event: ProcessingEvent): Promise<void> {
    await this.ruleResolver.resolve(event.id)
  }
}
