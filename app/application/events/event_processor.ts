import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { EventRepository } from '#persistence/events/event_repository'
import { EventWorkflow } from '#application/events/event_workflow'

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
