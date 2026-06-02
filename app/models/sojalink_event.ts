import { SojalinkEventSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import SojalinkAttempt from '#models/sojalink_attempt'
import SojalinkEntityCorrelation from '#models/sojalink_entity_correlation'
import SojalinkRuleVersion from '#models/sojalink_rule_version'
import SojalinkEventType from '#models/sojalink_event_type'

export default class SojalinkEvent extends SojalinkEventSchema {
  @hasMany(() => SojalinkAttempt)
  declare sojalink_attempts: HasMany<typeof SojalinkAttempt>

  @hasMany(() => SojalinkEntityCorrelation)
  declare sojalink_entity_correlations: HasMany<typeof SojalinkEntityCorrelation>

  @belongsTo(() => SojalinkRuleVersion)
  declare sojalink_rule_versions: BelongsTo<typeof SojalinkRuleVersion>

  @belongsTo(() => SojalinkEventType)
  declare sojalink_event_types: BelongsTo<typeof SojalinkEventType>
}
