import { DateTime } from 'luxon'
import SojalinkAttempt from '#models/sojalink_attempt'
import type { Attempt, AttemptStatus } from '#domain/events/attempt'

export class AttemptRepository {
  async createAttempt(eventId: number): Promise<Attempt> {
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

  async markAttemptAsSuccess(attemptId: number): Promise<void> {
    const attempt = await SojalinkAttempt.findOrFail(attemptId)

    attempt.merge({
      status: 'success',
      finishedAt: DateTime.utc(),
    })

    await attempt.save()
  }

  async markAttemptAsFailed(attemptId: number, error: Error): Promise<void> {
    const attempt = await SojalinkAttempt.findOrFail(attemptId)

    attempt.merge({
      status: 'failed',
      errorCode: error.name,
      errorMessage: error.message,
      finishedAt: DateTime.utc(),
    })

    await attempt.save()
  }

  private toAttempt(attempt: SojalinkAttempt): Attempt {
    return {
      id: attempt.id,
      eventId: attempt.eventId,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status as AttemptStatus,
      errorCode: attempt.errorCode,
      errorMessage: attempt.errorMessage,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
    }
  }
}
