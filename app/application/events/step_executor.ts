import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import type { ProcessingEvent } from '#domain/events/event'
import type { PipelineStep } from '#domain/events/pipeline'
import type { HandlerEvent, HandlerOutput } from '#domain/events/handler'
import { resolveStepInput } from '#application/events/input_resolver'
import { HandlerRegistry } from '#application/handlers/handler_registry'
import { StepLogRepository } from '#persistence/events/step_log_repository'

export type StepExecutionRequest = {
  event: ProcessingEvent
  step: PipelineStep
  stepIndex: number
  attemptId: number
  previousOutputs: Record<string, HandlerOutput>
}

/**
 * Executes a single pipeline step: resolves the input, calls the handler
 * and writes a step log — for successes and failures alike.
 */
@inject()
export class StepExecutor {
  constructor(
    private handlerRegistry: HandlerRegistry,
    private stepLogRepository: StepLogRepository
  ) {}

  async execute(request: StepExecutionRequest): Promise<HandlerOutput> {
    const { event, step, stepIndex, attemptId, previousOutputs } = request

    const startedAt = DateTime.utc()
    const handlerEvent = this.toHandlerEvent(event)

    // On input resolution failure, the raw template is logged instead.
    let input: Record<string, unknown> = step.input ?? {}

    try {
      const handler = this.handlerRegistry.resolve(step.handler)

      input = resolveStepInput(step.input ?? {}, { event: handlerEvent, steps: previousOutputs })

      const output = await handler.execute({
        event: handlerEvent,
        input,
        steps: previousOutputs,
      })

      await this.stepLogRepository.createStepLog({
        attemptId,
        stepIndex,
        stepCode: step.key,
        handlerName: step.handler,
        status: 'success',
        inputJson: JSON.stringify(input),
        outputJson: JSON.stringify(output),
        errorCode: null,
        errorMessage: null,
        startedAt,
        finishedAt: DateTime.utc(),
      })

      return output
    } catch (error) {
      await this.stepLogRepository.createStepLog({
        attemptId,
        stepIndex,
        stepCode: step.key,
        handlerName: step.handler,
        status: 'failed',
        inputJson: JSON.stringify(input),
        outputJson: null,
        errorCode: (error as Error).name,
        errorMessage: (error as Error).message,
        startedAt,
        finishedAt: DateTime.utc(),
      })

      throw error
    }
  }

  private toHandlerEvent(event: ProcessingEvent): HandlerEvent {
    return {
      id: event.id,
      sourceApp: event.sourceApp,
      sourceEntityType: event.sourceEntityType,
      sourceEntityId: event.sourceEntityId,
      payload: event.payload,
    }
  }
}
