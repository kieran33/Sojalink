import { BaseTransformer } from '@adonisjs/core/transformers'
import type SojalinkEvent from '#models/sojalink_event'
import type { EventStatus } from '#domain/events/event'
import AttemptTransformer from '#http/transformers/attempt_transformer'
import EventTypeTransformer from '#transformers/event_type_transformer'

const STATUS_LABELS: Record<EventStatus, string> = {
  pending: 'En attente',
  processing: 'En cours',
  processed: 'Traité',
  failed: 'Échec',
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default class EventTransformer extends BaseTransformer<SojalinkEvent> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'sourceApp',
        'sourceEntityType',
        'sourceEntityId',
        'status',
        'resolutionErrorCode',
        'resolutionErrorMessage',
        'resolvedAt',
        'processingStartedAt',
        'processedAt',
        'failedAt',
        'createdAt',
      ]),
      statusLabel: STATUS_LABELS[this.resource.status as EventStatus],
      eventType: EventTypeTransformer.transform(this.whenLoaded(this.resource.eventType)),
      payload: safeParseJson(this.resource.payloadJson),
      attempts: AttemptTransformer.transform(this.whenLoaded(this.resource.attempts)),
    }
  }
}
