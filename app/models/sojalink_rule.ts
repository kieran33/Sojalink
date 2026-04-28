import { SojalinkRuleSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import SojalinkRuleVersion from './sojalink_rule_version.ts'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import SojalinkEventType from './sojalink_event_type.ts'

export default class SojalinkRule extends SojalinkRuleSchema {
  @hasMany(() => SojalinkRuleVersion)
  declare sojalink_rule_versions: HasMany<typeof SojalinkRuleVersion>

  @belongsTo(() => SojalinkEventType)
  declare sojalink_event_types: BelongsTo<typeof SojalinkEventType>
}
