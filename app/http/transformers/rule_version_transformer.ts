import { BaseTransformer } from '@adonisjs/core/transformers'
import type SojalinkRuleVersion from '#models/sojalink_rule_version'
import EventTransformer from '#http/transformers/event_transformer'

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default class RuleVersionTransformer extends BaseTransformer<SojalinkRuleVersion> {
  toObject() {
    return this.pick(this.resource, ['id', 'versionNumber', 'isActive'])
  }

  forDetailedView() {
    return {
      ...this.toObject(),
      conditions: safeParseJson(this.resource.conditionsJson),
      pipeline: safeParseJson(this.resource.pipelineJson),
      events: EventTransformer.transform(this.whenLoaded(this.resource.appliedEvents)),
    }
  }
}
