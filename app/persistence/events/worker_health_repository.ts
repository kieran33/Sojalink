import redis from '@adonisjs/redis/services/main'

type WorkerHealthStats = {
  isHealthy: boolean
  lastRunAt: string | null
  averageDuration: number | null
  recentRunsCount: number
}

export class WorkerHealthRepository {
  private heartbeatKey = 'worker_pending_event:last_heartbeat'
  private durationsKey = 'worker_pending_event:recent_durations'
  private maxStatsInHistory = 20
  private brokeAfterSeconds = 30

  async recordRun(duration: number): Promise<void> {
    const now = new Date().toISOString()

    await redis.set(this.heartbeatKey, now)
    await redis.lpush(this.durationsKey, duration.toString())
    await redis.ltrim(this.durationsKey, 0, this.maxStatsInHistory - 1)
  }

  async getStats(): Promise<WorkerHealthStats> {
    const lastRunAt = await redis.get(this.heartbeatKey)
    const durations = await redis.lrange(this.durationsKey, 0, -1)

    const isHealthy = lastRunAt
      ? (Date.now() - new Date(lastRunAt).getTime()) / 1000 < this.brokeAfterSeconds
      : false

    const averageDuration =
      durations.length > 0
        ? durations.reduce((sum, d) => sum + Number(d), 0) / durations.length
        : null

    return {
      isHealthy,
      lastRunAt,
      averageDuration,
      recentRunsCount: durations.length,
    }
  }
}
