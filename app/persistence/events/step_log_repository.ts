import SojalinkStepLog from '#models/sojalink_step_log'
import type { StepLog, StepLogStatus } from '#domain/events/step_log'
import type { DateTime } from 'luxon'

export type CreateStepLogInput = {
  attemptId: number
  stepIndex: number
  stepCode: string
  handlerName: string
  status: StepLogStatus
  inputJson: string
  outputJson: string | null
  errorCode: string | null
  errorMessage: string | null
  startedAt: DateTime
  finishedAt: DateTime
}

export class StepLogRepository {
  async createStepLog(data: CreateStepLogInput): Promise<StepLog> {
    const stepLog = await SojalinkStepLog.create({ ...data })

    return this.toStepLog(stepLog)
  }

  private toStepLog(stepLog: SojalinkStepLog): StepLog {
    return {
      id: stepLog.id,
      attemptId: stepLog.attemptId,
      stepIndex: stepLog.stepIndex,
      stepCode: stepLog.stepCode,
      handlerName: stepLog.handlerName,
      status: stepLog.status as StepLogStatus,
      inputJson: stepLog.inputJson,
      outputJson: stepLog.outputJson,
      errorCode: stepLog.errorCode,
      errorMessage: stepLog.errorMessage,
      startedAt: stepLog.startedAt,
      finishedAt: stepLog.finishedAt,
    }
  }
}
