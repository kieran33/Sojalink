import type { DateTime } from 'luxon'

export type ProcessingEvent = {
  id: number
  status: 'processing'
  eventTypeId: number
  sourceApp: string
  sourceEntityType: string
  sourceEntityId: string
  payload: string
  createdAt: DateTime
  processingStartedAt: DateTime
}
