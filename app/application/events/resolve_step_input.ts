import type { ProcessingEvent } from '#domain/events/event'

export function resolveStepInput(event: ProcessingEvent) {
  return {
    event: {
      id: event.id,
      sourceApp: event.sourceApp,
      sourceEntityType: event.sourceEntityType,
      sourceEntityId: event.sourceEntityId,
      payload: JSON.parse(event.payloadJson),
    },
  }
}
