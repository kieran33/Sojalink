import type { DateTime } from 'luxon'

export type ProcessingEvent = {
  id: number
  status: 'processing'
  eventTypeId: number
  sourceApp: string
  sourceEntityType: string
  sourceEntityId: number
  payloadJson: string
  createdAt: DateTime
  processingStartedAt: DateTime
  appliedRuleVersionId: number | null
}
