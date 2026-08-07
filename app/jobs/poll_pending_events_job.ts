import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { PendingEventsWorker } from '#workers/pending_events_worker'

@inject()
export default class PollPendingEventsJob extends Job {
  static options: JobOptions = {
    queue: 'pending_events',
    timeout: '1m',
  }

  constructor(private pendingEventsWorker: PendingEventsWorker) {
    super()
  }

  async execute(): Promise<void> {
    await this.pendingEventsWorker.handle()
  }

  async failed(error: Error): Promise<void> {
    logger.error({ err: error }, 'Poll pending events job failed')
  }
}
