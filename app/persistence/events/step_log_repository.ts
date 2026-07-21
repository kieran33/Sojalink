import SojalinkStepLog from '#models/sojalink_step_log'
import type { StepLog } from '#domain/events/step_log'
import { DateTime } from 'luxon'

export class StepLogRepository {
  async createStepLog(
    attemptId: number,
    stepIndex: number,
    stepCode: string,
    handlerKey: string,
    status: string,
    inputJson: string,
    outputJson: string | null,
    errorCode: string | null,
    errorMessage: string | null
  ): Promise<StepLog> {
    const stepLog = await SojalinkStepLog.create({
      attemptId,
      stepIndex,
      stepCode,
      handlerKey,
      status,
      inputJson,
      outputJson,
      errorCode,
      errorMessage,
      startedAt: DateTime.utc(),
      finishedAt: DateTime.utc(),
    })
    return this.toStepLog(stepLog)
  }

  private toStepLog(stepLog: SojalinkStepLog): StepLog {
    return {
      id: stepLog.id,
      attemptId: stepLog.attemptId,
      stepIndex: stepLog.stepIndex,
      stepCode: stepLog.stepCode,
      handlerKey: stepLog.handlerKey,
      status: stepLog.status,
      inputJson: stepLog.inputJson,
      outputJson: stepLog.outputJson,
      errorCode: stepLog.errorCode,
      errorMessage: stepLog.errorMessage,
      startedAt: stepLog.startedAt,
      finishedAt: stepLog.finishedAt,
    }
  }
}
