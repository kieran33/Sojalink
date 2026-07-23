import { SojalinkStepLogSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import SojalinkAttempt from '#models/sojalink_attempt'

export default class SojalinkStepLog extends SojalinkStepLogSchema {
  @belongsTo(() => SojalinkAttempt, { foreignKey: 'attemptId' })
  declare attempt: BelongsTo<typeof SojalinkAttempt>
}
