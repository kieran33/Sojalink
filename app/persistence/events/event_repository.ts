import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import SojalinkEvent from '#models/sojalink_event'
import type { ProcessingEvent } from '#domain/events/event'

export class EventRepository {
  async reserveNextPendingEvent(): Promise<ProcessingEvent | null> {
    return db.transaction(async (transaction) => {
      const event = await SojalinkEvent.query({ client: transaction })
        .where('status', 'pending')
        .orderBy('createdAt', 'asc')
        .forUpdate()
        .skipLocked()
        .first()

      if (!event) {
        return null
      }

      event.status = 'processing'
      event.processingStartedAt = DateTime.utc()

      await event.useTransaction(transaction).save()

      return this.toProcessingEvent(event)
    })
  }

  async markEventAsProcessed(eventId: number): Promise<void> {
    await SojalinkEvent.query().where('id', eventId).update({
      status: 'processed',
    })
  }

  async markEventAsFailed(eventId: number): Promise<void> {
    await SojalinkEvent.query().where('id', eventId).update({
      status: 'failed',
    })
  }

  private toProcessingEvent(event: SojalinkEvent): ProcessingEvent {
    if (!event.processingStartedAt) {
      throw new Error('Expected processingStartedAt to be defined')
    }

    return {
      id: event.id,
      status: 'processing',
      eventTypeId: event.eventTypeId,
      sourceApp: event.sourceApp,
      sourceEntityType: event.sourceEntityType,
      sourceEntityId: event.sourceEntityId,
      payload: event.payloadJson,
      createdAt: event.createdAt,
      processingStartedAt: event.processingStartedAt,
    }
  }
}
