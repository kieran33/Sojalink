import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { EventRepository } from '#persistence/events/event_repository'
import { EventWorkflow } from '#application/events/event_workflow'

/**
 * Entry point of one polling tick: reserves the next pending event, runs
 * the workflow and owns the final event status (processed | failed).
 *
 * A failed event is a business outcome, already traced in the event,
 * attempt and step logs — it is logged but not rethrown, so the polling
 * job itself does not fail.
 */
@inject()
export class EventProcessor {
  constructor(
    private eventRepository: EventRepository,
    private eventWorkflow: EventWorkflow
  ) {}

  async process(): Promise<void> {
    const event = await this.eventRepository.reserveNextPendingEvent()

    if (!event) {
      logger.debug('No pending event available')
      return
    }

    logger.info({ eventId: event.id }, 'Pending event reserved for processing')

    try {
      await this.eventWorkflow.run(event)
      await this.eventRepository.markEventAsProcessed(event.id)

      logger.info({ eventId: event.id }, 'Event processed successfully')
    } catch (error) {
      await this.eventRepository.markEventAsFailed(event.id)

      logger.error({ err: error, eventId: event.id }, 'Event processing failed')
    }
  }
}
