import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { EventRepository } from '#persistence/events/event_repository'
import { EventProcessor } from '#application/events/event_processor'

@inject()
export class ProcessNextPendingEvent {
  constructor(
    private eventRepository: EventRepository,
    private eventProcessor: EventProcessor
  ) {}

  async handle(): Promise<void> {
    const event = await this.eventRepository.reserveNextPendingEvent()

    if (!event) {
      logger.debug('No pending event available')
      return
    }

    logger.info({ event: event }, 'Pending event reserved for processing')

    try {
      await this.eventProcessor.process(event)
      await this.eventRepository.markEventAsProcessed(event.id)

      logger.info({ event: event }, 'Event processed successfully')
    } catch (error) {
      await this.eventRepository.markEventAsFailed(event.id)

      logger.error({ err: error, event: event }, 'Pending event processing failed')

      throw error
    }
  }
}
