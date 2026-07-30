import { BaseTransformer } from '@adonisjs/core/transformers'
import type SojalinkAttempt from '#models/sojalink_attempt'
import StepLogTransformer from '#transformers/step_log_transformer'

export default class AttemptTransformer extends BaseTransformer<SojalinkAttempt> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'attemptNumber',
        'status',
        'errorCode',
        'errorMessage',
        'startedAt',
        'finishedAt',
      ]),
      stepLogs: StepLogTransformer.transform(this.whenLoaded(this.resource.stepLogs)),
    }
  }
}
