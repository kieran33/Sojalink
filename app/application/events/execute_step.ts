import type { Input } from '#domain/events/input'
import type { Step } from '#domain/events/step'
import { StepLogRepository } from '#persistence/events/step_log_repository'

const stepLogRepository = new StepLogRepository()

export async function executeStepInOrder(
  step: Step,
  input: Input,
  attemptId: number,
  stepIndex: number
) {
  const knownHandlers = ['create_toki_task']

  if (!knownHandlers.includes(step.handler)) {
    throw new Error(`Unknown handler: ${step.handler}`)
  }

  const output = { status: 'done' }

  await stepLogRepository.createStepLog(
    attemptId,
    stepIndex,
    step.key,
    step.handler,
    'success',
    JSON.stringify(input),
    JSON.stringify(output),
    null,
    null
  )

  return output
}
