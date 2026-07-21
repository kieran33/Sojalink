import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RuleRepository } from '#persistence/events/rule_repository'
import { AttemptRepository } from '#persistence/events/attempt_repository'
import { EventRepository } from '#persistence/events/event_repository'
import { executeStepInOrder } from './execute_step.ts'
import { ValidatePipeline } from './validate_pipeline.ts'
import { resolveStepInput } from './resolve_step_input.ts'

@inject()
export class ExecuteEvent {
  constructor(
    private ruleRepository: RuleRepository,
    private attemptRepository: AttemptRepository,
    private eventRepository: EventRepository,
    private validatePipeline: ValidatePipeline
  ) {}
  async execute(eventId: number): Promise<void> {
    const event = await this.ruleRepository.findProcessingEvent(eventId)

    if (!event) {
      throw new Error(`Event ${eventId} is not processing`)
    }
    if (!event.appliedRuleVersionId) {
      throw new Error(`No applied rule version for event ${eventId}`)
    }

    const newAttempt = await this.attemptRepository.createAttempt(eventId)

    try {
      const pipeline = await this.validatePipeline.validate(event.appliedRuleVersionId)

      const input = resolveStepInput(event)

      const outputs: Record<string, unknown> = {}

      for (const [index, step] of pipeline.steps.entries()) {
        outputs[step.key] = await executeStepInOrder(step, input, newAttempt.id, index)
      }
      await this.eventRepository.markEventAsProcessed(eventId)
      await this.attemptRepository.markAttemptAsSuccess(newAttempt.id)
      await this.attemptRepository.registerAttemptFinishedAt(newAttempt.id)
    } catch (error) {
      await this.eventRepository.markEventAsFailed(eventId)
      await this.attemptRepository.markAttemptAsFailed(newAttempt.id, error as Error)
      await this.attemptRepository.registerAttemptFinishedAt(newAttempt.id)
      logger.error({ err: error }, 'Pipeline failed')
      throw error
    }
  }
}
