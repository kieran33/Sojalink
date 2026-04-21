import { SojalinkAttemptSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import SojalinkStepLog from './sojalink_step_log.ts'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import SojalinkEvent from './sojalink_event.ts'

export default class SojalinkAttempt extends SojalinkAttemptSchema {
  @hasMany(() => SojalinkStepLog)
  declare sojalink_step_logs: HasMany<typeof SojalinkStepLog>

  @belongsTo(() => SojalinkEvent)
  declare sojalink_events: BelongsTo<typeof SojalinkEvent>
}
