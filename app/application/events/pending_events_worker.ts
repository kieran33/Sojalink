import { inject } from '@adonisjs/core'
import { EventProcessor } from '#application/events/event_processor'
import { WorkerHealthRepository } from '#persistence/events/worker_health_repository'

@inject()
export class PendingEventsWorker {
  constructor(
    private eventProcessor: EventProcessor,
    private workerHealthRepository: WorkerHealthRepository
  ) {}

  async handle(): Promise<void> {
    const startedAt = Date.now()

    await this.eventProcessor.process()

    const duration = Date.now() - startedAt
    await this.workerHealthRepository.recordRun(duration)
  }
}
