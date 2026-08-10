import { WorkerHealthRepository } from '#persistence/events/worker_health_repository'
import { inject } from '@adonisjs/core'

@inject()
export default class GetWorkerHealth {
  constructor(private workerHealthRepository: WorkerHealthRepository) {}

  async handle() {
    return this.workerHealthRepository.getStats()
  }
}
