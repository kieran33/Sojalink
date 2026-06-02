import { SojalinkRuleVersionSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import SojalinkEvent from '#models/sojalink_event'
import SojalinkRule from '#models/sojalink_rule'

export default class SojalinkRuleVersion extends SojalinkRuleVersionSchema {
  @hasMany(() => SojalinkEvent)
  declare sojalink_events: HasMany<typeof SojalinkEvent>

  @belongsTo(() => SojalinkRule)
  declare sojalink_rules: BelongsTo<typeof SojalinkRule>
}
