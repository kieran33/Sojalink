import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import ListRulesWithStats from '#http/actions/dashboard/list_rules_with_stats'
import RuleTransformer from '#transformers/rule_transformer'
import EventTransformer from '#transformers/event_transformer'
import Scenario1NominalSeeder from '#database/seeders/scenarios/scenario_1_nominal_seeder'
import Scenario2NoMatchingRuleSeeder from '#database/seeders/scenarios/scenario_2_no_matching_rule_seeder'
import Scenario3MultiStepSeeder from '#database/seeders/scenarios/scenario_3_multi_step_seeder'
import Scenario4FailingStepSeeder from '#database/seeders/scenarios/scenario_4_failing_step_seeder'
import Scenario5InvalidPipelineSeeder from '#database/seeders/scenarios/scenario_5_invalid_pipeline_seeder'

const DEMO_SEEDERS = [
  Scenario1NominalSeeder,
  Scenario2NoMatchingRuleSeeder,
  Scenario3MultiStepSeeder,
  Scenario4FailingStepSeeder,
  Scenario5InvalidPipelineSeeder,
]

export default class DashboardController {
  async index({ inertia, request }: HttpContext) {
    const page = Math.max(1, Number(request.qs().page) || 1)
    const { rules, pagination, stats, unattributedFailedEvents } =
      await ListRulesWithStats.handle(page)

    return inertia.render('dashboard/index', {
      rules: RuleTransformer.transform(rules),
      pagination,
      stats,
      unattributedEvents: EventTransformer.transform(unattributedFailedEvents),
    })
  }

  async seedDemo({ response, session }: HttpContext) {
    if (!env.get('ALLOW_DEMO_SEED')) {
      return response.forbidden('Fonctionnalité désactivée sur cet environnement')
    }

    for (const Seeder of DEMO_SEEDERS) {
      await new Seeder(db.connection()).run()
    }

    session.flash('success', '5 événements de démonstration ajoutés')
    return response.redirect().back()
  }
}