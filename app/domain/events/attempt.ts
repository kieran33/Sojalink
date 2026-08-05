import type { DateTime } from 'luxon'

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
