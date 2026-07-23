import { SojalinkRuleSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import SojalinkEventType from '#models/sojalink_event_type'
import SojalinkRuleVersion from '#models/sojalink_rule_version'

export default class SojalinkRule extends SojalinkRuleSchema {
  @hasMany(() => SojalinkRuleVersion, { foreignKey: 'ruleId' })
  declare versions: HasMany<typeof SojalinkRuleVersion>

  @belongsTo(() => SojalinkEventType, { foreignKey: 'eventTypeId' })
  declare eventType: BelongsTo<typeof SojalinkEventType>
}
