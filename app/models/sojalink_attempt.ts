import { SojalinkAttemptSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import SojalinkStepLog from '#models/sojalink_step_log'
import SojalinkEvent from '#models/sojalink_event'

export default class SojalinkAttempt extends SojalinkAttemptSchema {
  @hasMany(() => SojalinkStepLog, { foreignKey: 'attemptId' })
  declare stepLogs: HasMany<typeof SojalinkStepLog>

  @belongsTo(() => SojalinkEvent, { foreignKey: 'eventId' })
  declare event: BelongsTo<typeof SojalinkEvent>
}
