import { SojalinkEventSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import SojalinkAttempt from '#models/sojalink_attempt'
import SojalinkEntityCorrelation from '#models/sojalink_entity_correlation'
import SojalinkRuleVersion from '#models/sojalink_rule_version'
import SojalinkEventType from '#models/sojalink_event_type'

export default class SojalinkEvent extends SojalinkEventSchema {
  @hasMany(() => SojalinkAttempt, { foreignKey: 'eventId' })
  declare attempts: HasMany<typeof SojalinkAttempt>

  @hasMany(() => SojalinkEntityCorrelation, { foreignKey: 'createdByEventId' })
  declare entityCorrelations: HasMany<typeof SojalinkEntityCorrelation>

  @belongsTo(() => SojalinkRuleVersion, { foreignKey: 'appliedRuleVersionId' })
  declare appliedRuleVersion: BelongsTo<typeof SojalinkRuleVersion>

  @belongsTo(() => SojalinkEventType, { foreignKey: 'eventTypeId' })
  declare eventType: BelongsTo<typeof SojalinkEventType>
}
