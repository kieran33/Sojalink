import { SojalinkStepLogSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import SojalinkAttempt from './sojalink_attempt.ts'

export default class SojalinkStepLog extends SojalinkStepLogSchema {
  @belongsTo(() => SojalinkAttempt)
  declare sojalink_attempts: BelongsTo<typeof SojalinkAttempt>
}
