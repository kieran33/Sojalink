import type { HttpContext } from '@adonisjs/core/http'
import GetRuleDetail from '#http/actions/rules/get_rule_details'
import RuleTransformer from '#transformers/rule_transformer'

export default class RulesController {
  async show({ params, inertia }: HttpContext) {
    const rule = await GetRuleDetail.handle(Number(params.id))

    return inertia.render('rules/show', {
      rule: RuleTransformer.transform(rule).useVariant('forShowPage'),
    })
  }
}
