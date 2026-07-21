import type { DateTime } from 'luxon'

export type StepLog = {
  id: number
  attemptId: number
  stepIndex: number
  stepCode: string
  handlerKey: string
  status: string
  inputJson: string
  outputJson: string | null
  errorCode: string | null
  errorMessage: string | null
  startedAt: DateTime
  finishedAt: DateTime | null
}
