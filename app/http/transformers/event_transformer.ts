import { BaseTransformer } from '@adonisjs/core/transformers'
import type SojalinkEvent from '#models/sojalink_event'
import AttemptTransformer from '#http/transformers/attempt_transformer'

export default class EventTransformer extends BaseTransformer<SojalinkEvent> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'sourceApp',
        'sourceEntityType',
        'sourceEntityId',
        'status',
        'resolutionErrorCode',
        'resolutionErrorMessage',
        'resolvedAt',
        'processingStartedAt',
        'processedAt',
        'failedAt',
        'createdAt',
      ]),
      attempts: AttemptTransformer.transform(this.whenLoaded(this.resource.attempts)),
    }
  }
}
