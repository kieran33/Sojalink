import type { DateTime } from 'luxon'

/**
 * Lifecycle statuses of a SojaLink event.
 * pending -> processing -> processed | failed
 */
export type EventStatus = 'pending' | 'processing' | 'processed' | 'failed'

/**
 * An event reserved by the worker, ready to be resolved and executed.
 * The payload is already parsed: the engine never manipulates raw JSON strings.
 */
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
