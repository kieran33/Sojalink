import SojalinkAttempt from '#models/sojalink_attempt'
import { DateTime } from 'luxon'
import type { AttemptEvent } from '#domain/events/attempt'

export class AttemptRepository {
  async createAttempt(eventId: number): Promise<AttemptEvent> {
    const existingAttempts = await SojalinkAttempt.query()
      .where('eventId', eventId)
      .count('* as total')

    const activeAttempt = await SojalinkAttempt.query()
      .where('eventId', eventId)
      .where('status', 'active')
      .first()

    if (activeAttempt) {
      throw new Error(`An attempt is already active for event ${eventId}`)
    }

    const attemptNumber = Number(existingAttempts[0].$extras.total) + 1

    const attempt = await SojalinkAttempt.create({
      eventId,
      attemptNumber,
      status: 'active',
      startedAt: DateTime.utc(),
    })

    return this.toAttempt(attempt)
  }

  async registerAttemptFinishedAt(attemptId: number): Promise<void> {
    await SojalinkAttempt.query()
      .where('id', attemptId)
      .update({
        finished_at: DateTime.utc().toFormat('yyyy-MM-dd HH:mm:ss'),
      })
  }

  async markAttemptAsSuccess(attemptId: number): Promise<void> {
    await SojalinkAttempt.query().where('id', attemptId).update({
      status: 'success',
    })
  }

  async markAttemptAsFailed(attemptId: number, error?: Error): Promise<void> {
    await SojalinkAttempt.query().where('id', attemptId).update({
      status: 'failed',
      errorMessage: error?.message,
      errorCode: error?.name,
    })
  }

  private toAttempt(attempt: SojalinkAttempt): AttemptEvent {
    return {
      id: attempt.id,
      eventId: attempt.eventId,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      errorCode: attempt.errorCode,
      errorMessage: attempt.errorMessage,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
    }
  }
}
