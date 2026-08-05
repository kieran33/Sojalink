import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import SojalinkEvent from '#models/sojalink_event'
import type { ProcessingEvent } from '#domain/events/event'
import { InvalidJsonError } from '#domain/events/errors'

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

  async findProcessingEvent(eventId: number): Promise<ProcessingEvent | null> {
    const event = await SojalinkEvent.query()
      .where('id', eventId)
      .where('status', 'processing')
      .first()

    if (!event) {
      return null
    }

    return this.toProcessingEvent(event)
  }

  async saveResolution(eventId: number, ruleVersionId: number, snapshot: unknown): Promise<void> {
    const event = await SojalinkEvent.findOrFail(eventId)

    event.merge({
      appliedRuleVersionId: ruleVersionId,
      resolutionSnapshotJson: JSON.stringify(snapshot),
      resolvedAt: DateTime.utc(),
    })

    await event.save()
  }

  async saveResolutionFailure(
    eventId: number,
    errorCode: string,
    errorMessage: string
  ): Promise<void> {
    const event = await SojalinkEvent.findOrFail(eventId)

    event.merge({
      resolutionErrorCode: errorCode,
      resolutionErrorMessage: errorMessage,
    })

    await event.save()
  }

  async markEventAsProcessed(eventId: number): Promise<void> {
    const event = await SojalinkEvent.findOrFail(eventId)

    event.merge({
      status: 'processed',
      processedAt: DateTime.utc(),
    })

    await event.save()
  }

  async markEventAsFailed(eventId: number): Promise<void> {
    const event = await SojalinkEvent.findOrFail(eventId)

    event.merge({
      status: 'failed',
      failedAt: DateTime.utc(),
    })

    await event.save()
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
      payload: this.parsePayload(event),
      createdAt: event.createdAt,
      processingStartedAt: event.processingStartedAt,
      appliedRuleVersionId: event.appliedRuleVersionId,
    }
  }

  private parsePayload(event: SojalinkEvent): Record<string, unknown> {
    try {
      const payload = JSON.parse(event.payloadJson)

      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('payload is not a JSON object')
      }

      return payload
    } catch {
      throw new InvalidJsonError(`Event ${event.id} has an invalid payload_json`)
    }
  }
}
