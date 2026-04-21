import { SojalinkRuleVersionSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import SojalinkEvent from './sojalink_event.ts'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import SojalinkRule from './sojalink_rule.ts'

export default class SojalinkRuleVersion extends SojalinkRuleVersionSchema {
  @hasMany(() => SojalinkEvent)
  declare sojalink_events: HasMany<typeof SojalinkEvent>

  @belongsTo(() => SojalinkRule)
  declare sojalink_rules: BelongsTo<typeof SojalinkRule>
}
