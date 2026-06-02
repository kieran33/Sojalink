import { SojalinkEntityCorrelationSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import SojalinkEvent from '#models/sojalink_event'

export default class SojalinkEntityCorrelation extends SojalinkEntityCorrelationSchema {
  @belongsTo(() => SojalinkEvent)
  declare sojalink_events: BelongsTo<typeof SojalinkEvent>
}
