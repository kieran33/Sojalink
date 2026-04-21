import { SojalinkEntityCorrelationSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import SojalinkEvent from './sojalink_event.ts'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class SojalinkEntityCorrelation extends SojalinkEntityCorrelationSchema {
  @belongsTo(() => SojalinkEvent)
  declare sojalink_events: BelongsTo<typeof SojalinkEvent>
}
