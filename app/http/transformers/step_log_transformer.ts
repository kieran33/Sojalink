import { BaseTransformer } from '@adonisjs/core/transformers'
import type SojalinkStepLog from '#models/sojalink_step_log'

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default class StepLogTransformer extends BaseTransformer<SojalinkStepLog> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'stepIndex',
        'stepCode',
        'handlerName',
        'status',
        'errorCode',
        'errorMessage',
        'startedAt',
        'finishedAt',
      ]),
      input: safeParseJson(this.resource.inputJson),
      output: this.resource.outputJson ? safeParseJson(this.resource.outputJson) : null,
    }
  }
}
