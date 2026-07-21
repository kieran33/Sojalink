import type { DateTime } from 'luxon'

export type AttemptEvent = {
  id: number
  eventId: number
  attemptNumber: number
  status: string
  errorCode: string | null
  errorMessage: string | null
  startedAt: DateTime
  finishedAt: DateTime | null
}
