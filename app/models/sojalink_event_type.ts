import { SojalinkEventTypeSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import SojalinkEvent from './sojalink_event.ts'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import SojalinkRule from './sojalink_rule.ts'

export default class SojalinkEventType extends SojalinkEventTypeSchema {
  @hasMany(() => SojalinkEvent)
  declare sojalink_events: HasMany<typeof SojalinkEvent>

  @hasMany(() => SojalinkRule)
  declare sojalink_rules: HasMany<typeof SojalinkRule>
}
