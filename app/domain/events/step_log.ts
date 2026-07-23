import type { DateTime } from 'luxon'

export type StepLogStatus = 'success' | 'failed'

export type StepLog = {
  id: number
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
  finishedAt: DateTime | null
}
