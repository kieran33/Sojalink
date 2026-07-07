import { inject } from '@adonisjs/core'
import { EventProcessor } from '#application/events/event_processor'

@inject()
export class PendingEventsWorker {
  constructor(private eventProcessor: EventProcessor) {}

  async handle(): Promise<void> {
    await this.eventProcessor.process()
  }
}
