import type { HttpContext } from '@adonisjs/core/http'
import ListRulesWithStats from '#http/actions/dashboard/list_rules_with_stats'
import RuleTransformer from '#transformers/rule_transformer'

export default class DashboardController {
  async index({ inertia, request }: HttpContext) {
    const page = Math.max(1, Number(request.qs().page) || 1)
    const { rules, pagination, stats } = await ListRulesWithStats.handle(page)

    return inertia.render('dashboard/index', {
      rules: RuleTransformer.transform(rules),
      pagination,
      stats,
    })
  }
}
