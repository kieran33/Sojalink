import { DateTime } from 'luxon'
import SojalinkRule from '#models/sojalink_rule'
import SojalinkEvent from '#models/sojalink_event'

export const RULES_PER_PAGE = 12

export default class ListRulesWithStats {
  static async handle(page = 1, perPage = RULES_PER_PAGE) {
    const since = DateTime.utc().minus({ hours: 24 })

    const [rulesPage, totalRules, activeRules, processedLast24h, failedLast24h] = await Promise.all(
      [
        SojalinkRule.query()
          .preload('eventType')
          .preload('versions', (query) => {
            query.orderBy('versionNumber', 'desc').preload('appliedEvents', (eventsQuery) => {
              eventsQuery.orderBy('createdAt', 'desc')
            })
          })
          .orderBy('priority', 'asc')
          .paginate(page, perPage),
        SojalinkRule.query().count('* as total'),
        SojalinkRule.query().where('isActive', true).count('* as total'),
        SojalinkEvent.query()
          .where('status', 'processed')
          .where('processedAt', '>=', since.toSQL()!)
          .count('* as total'),
        SojalinkEvent.query()
          .where('status', 'failed')
          .where('failedAt', '>=', since.toSQL()!)
          .count('* as total'),
      ]
    )

    return {
      rules: rulesPage.all(),
      pagination: {
        page: rulesPage.currentPage,
        perPage: rulesPage.perPage,
        total: rulesPage.total,
        lastPage: rulesPage.lastPage,
      },
      stats: {
        totalRules: Number(totalRules[0].$extras.total),
        activeRules: Number(activeRules[0].$extras.total),
        processedLast24h: Number(processedLast24h[0].$extras.total),
        failedLast24h: Number(failedLast24h[0].$extras.total),
      },
    }
  }
}
