import { inject } from '@adonisjs/core'
import { ProcessNextPendingEvent } from '#application/events/process_next_pending_event'

@inject()
export class PendingEventsWorker {
  constructor(private processNextPendingEventUseCase: ProcessNextPendingEvent) {}

  async handle(): Promise<void> {
    await this.processNextPendingEventUseCase.handle()
  }
}
