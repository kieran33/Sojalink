import { SojalinkEventTypeSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import SojalinkEvent from '#models/sojalink_event'
import SojalinkRule from '#models/sojalink_rule'

export default class SojalinkEventType extends SojalinkEventTypeSchema {
  @hasMany(() => SojalinkEvent)
  declare sojalink_events: HasMany<typeof SojalinkEvent>

  @hasMany(() => SojalinkRule)
  declare sojalink_rules: HasMany<typeof SojalinkRule>
}
