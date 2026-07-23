import type { DateTime } from 'luxon'

/**
 * Lifecycle statuses of a pipeline execution attempt.
 * Exactly one attempt may be active per event at any time.
 */
export type AttemptStatus = 'active' | 'success' | 'failed'

export type Attempt = {
  id: number
  eventId: number
  attemptNumber: number
  status: AttemptStatus
  errorCode: string | null
  errorMessage: string | null
  startedAt: DateTime
  finishedAt: DateTime | null
}
