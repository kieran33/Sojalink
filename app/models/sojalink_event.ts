import { SojalinkEventSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import SojalinkAttempt from './sojalink_attempt.ts'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import SojalinkEntityCorrelation from './sojalink_entity_correlation.ts'
import SojalinkRuleVersion from './sojalink_rule_version.ts'
import SojalinkEventType from './sojalink_event_type.ts'

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
