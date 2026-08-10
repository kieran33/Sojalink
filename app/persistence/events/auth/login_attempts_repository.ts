import redis from '@adonisjs/redis/services/main'

const MAX_ATTEMPTS = 5
const FIRST_LOCKOUT_SECONDS = 60 * 60
const REPEATED_LOCKOUT_SECONDS = 60 * 60 * 24

export class LoginAttemptsRepository {
  private attemptsKey(username: string) {
    return `login_failed_attempts:${username}`
  }

  private lockoutUntilKey(username: string) {
    return `login_lockout_expires_at:${username}`
  }

  private lockoutCountKey(username: string) {
    return `login_lockouts_count:${username}`
  }

  async isLocked(username: string): Promise<boolean> {
    const lockedUntil = await redis.get(this.lockoutUntilKey(username))
    return lockedUntil !== null
  }

  async registerFailedAttempt(username: string): Promise<void> {
    const attempts = await redis.incr(this.attemptsKey(username))

    if (attempts < MAX_ATTEMPTS) {
      return
    }

    const lockoutCount = await redis.incr(this.lockoutCountKey(username))
    const durationInSeconds = lockoutCount === 1 ? FIRST_LOCKOUT_SECONDS : REPEATED_LOCKOUT_SECONDS

    await redis.set(this.lockoutUntilKey(username), '1', 'EX', durationInSeconds)
    await redis.del(this.attemptsKey(username))
  }

  async registerSuccessfulLogin(username: string): Promise<void> {
    await redis.del(this.attemptsKey(username))
    await redis.del(this.lockoutUntilKey(username))
    await redis.del(this.lockoutCountKey(username))
  }
}
