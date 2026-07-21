import { inject } from '@adonisjs/core'
import { RuleVersionRepository } from '#persistence/events/rule_version_repository'

@inject()
export class ValidatePipeline {
  constructor(private ruleVersionRepository: RuleVersionRepository) {}

  async validate(ruleVersionId: number) {
    const ruleVersion = await this.ruleVersionRepository.findPipelineByRuleVersion(ruleVersionId)

    if (!ruleVersion) {
      throw new Error(`No pipeline found for rule version ${ruleVersionId}`)
    }

    const pipeline = JSON.parse(ruleVersion.pipelineJson)

    if (!pipeline.steps || pipeline.steps.length === 0) {
      throw new Error('No steps for this pipeline')
    }

    for (const step of pipeline.steps) {
      if (!step.handler) {
        throw new Error(`No handler for this step`)
      }
    }

    const keys = pipeline.steps.map((step: any) => step.key)

    const uniqueKeys = new Set(keys)

    if (uniqueKeys.size !== keys.length) {
      throw new Error('Duplicate keys for this steps')
    }

    return pipeline
  }
}
