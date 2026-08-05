import type { DateTime } from 'luxon'

export type EventStatus = 'pending' | 'processing' | 'processed' | 'failed'

export type ProcessingEvent = {
  id: number
  status: 'processing'
  eventTypeId: number
  sourceApp: string
  sourceEntityType: string
  sourceEntityId: number
  payload: Record<string, unknown>
  createdAt: DateTime
  processingStartedAt: DateTime
  appliedRuleVersionId: number | null
}
