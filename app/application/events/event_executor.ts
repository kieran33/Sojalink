import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ProcessingEvent } from '#domain/events/event'
import type { HandlerOutput } from '#domain/events/handler'
import { EventExecutionError } from '#domain/events/errors'
import { PipelineValidator } from '#application/events/pipeline_validator'
import { StepExecutor } from '#application/events/step_executor'
import { AttemptRepository } from '#persistence/events/attempt_repository'
import { RuleVersionRepository } from '#persistence/events/rule_version_repository'

/**
 * Executes the pipeline of an already-resolved event.
 *
 * Owns the attempt lifecycle (create -> success | failed) and the
 * sequential step execution with stop-at-first-failure. The final event
 * status is owned by the EventProcessor, not by the executor.
 */
@inject()
export class EventExecutor {
  constructor(
    private ruleVersionRepository: RuleVersionRepository,
    private attemptRepository: AttemptRepository,
    private pipelineValidator: PipelineValidator,
    private stepExecutor: StepExecutor
  ) {}

  async execute(event: ProcessingEvent): Promise<void> {
    if (!event.appliedRuleVersionId) {
      throw new EventExecutionError(`No applied rule version for event ${event.id}`)
    }

    const attempt = await this.attemptRepository.createAttempt(event.id)

    try {
      const ruleVersion = await this.ruleVersionRepository.findById(event.appliedRuleVersionId)

      if (!ruleVersion) {
        throw new EventExecutionError(`Rule version ${event.appliedRuleVersionId} not found`)
      }

      const pipeline = this.pipelineValidator.validate(ruleVersion.pipelineJson)

      const outputs: Record<string, HandlerOutput> = {}

      for (const [index, step] of pipeline.steps.entries()) {
        outputs[step.key] = await this.stepExecutor.execute({
          event,
          step,
          stepIndex: index,
          attemptId: attempt.id,
          previousOutputs: outputs,
        })
      }

      await this.attemptRepository.markAttemptAsSuccess(attempt.id)

      logger.info({ eventId: event.id, attemptId: attempt.id }, 'Pipeline executed successfully')
    } catch (error) {
      await this.attemptRepository.markAttemptAsFailed(attempt.id, error as Error)

      logger.error(
        { err: error, eventId: event.id, attemptId: attempt.id },
        'Pipeline execution failed'
      )

      throw error
    }
  }
}
