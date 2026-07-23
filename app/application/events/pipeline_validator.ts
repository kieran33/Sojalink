import { inject } from '@adonisjs/core'
import type { Pipeline, PipelineStep } from '#domain/events/pipeline'
import { PipelineValidationError } from '#domain/events/errors'
import { collectInputReferences } from '#application/events/input_resolver'
import { HandlerRegistry } from '#application/handlers/handler_registry'

/**
 * Validates a raw `pipeline_json` before any step is executed:
 * - `steps` present and non-empty
 * - every step has a non-empty, unique `key`
 * - every step has a `handler` registered in the HandlerRegistry
 * - every `{{ steps.<key>.* }}` reference points to a previous step
 *
 * An invalid pipeline fails the attempt before the first step runs.
 */
@inject()
export class PipelineValidator {
  constructor(private handlerRegistry: HandlerRegistry) {}

  validate(pipelineJson: string): Pipeline {
    const pipeline = this.parse(pipelineJson)
    const previousKeys = new Set<string>()

    pipeline.steps.forEach((step, index) => {
      this.validateStepShape(step, index, previousKeys)
      this.validateStepReferences(step, previousKeys)
      previousKeys.add(step.key)
    })

    return pipeline
  }

  private parse(pipelineJson: string): Pipeline {
    let parsed: unknown

    try {
      parsed = JSON.parse(pipelineJson)
    } catch {
      throw new PipelineValidationError('pipeline_json is not valid JSON')
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new PipelineValidationError('Pipeline must be a JSON object with a "steps" array')
    }

    const steps = (parsed as Record<string, unknown>).steps

    if (!Array.isArray(steps) || steps.length === 0) {
      throw new PipelineValidationError('Pipeline must declare at least one step')
    }

    return { steps: steps as PipelineStep[] }
  }

  private validateStepShape(step: PipelineStep, index: number, previousKeys: Set<string>): void {
    if (typeof step.key !== 'string' || step.key.trim() === '') {
      throw new PipelineValidationError(`Step at index ${index} has no "key"`)
    }

    if (previousKeys.has(step.key)) {
      throw new PipelineValidationError(`Duplicate step key "${step.key}"`)
    }

    if (typeof step.handler !== 'string' || step.handler.trim() === '') {
      throw new PipelineValidationError(`Step "${step.key}" has no "handler"`)
    }

    if (!this.handlerRegistry.has(step.handler)) {
      throw new PipelineValidationError(
        `Step "${step.key}" references unknown handler "${step.handler}"`
      )
    }

    if (
      step.input !== undefined &&
      (typeof step.input !== 'object' || step.input === null || Array.isArray(step.input))
    ) {
      throw new PipelineValidationError(`Step "${step.key}" input must be a JSON object`)
    }
  }

  private validateStepReferences(step: PipelineStep, previousKeys: Set<string>): void {
    for (const reference of collectInputReferences(step.input)) {
      const [root, referencedKey] = reference.split('.')

      if (root === 'steps' && (!referencedKey || !previousKeys.has(referencedKey))) {
        throw new PipelineValidationError(
          `Step "${step.key}" references "steps.${referencedKey ?? ''}" which is not a previous step`
        )
      }
    }
  }
}
