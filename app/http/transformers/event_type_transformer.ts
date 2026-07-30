import { BaseTransformer } from '@adonisjs/core/transformers'
import type SojalinkEventType from '#models/sojalink_event_type'

export default class EventTypeTransformer extends BaseTransformer<SojalinkEventType> {
  toObject() {
    return this.pick(this.resource, ['id', 'code', 'label'])
  }
}
