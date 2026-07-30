import { DateTime } from 'luxon'
import SojalinkRule from '#models/sojalink_rule'
import SojalinkEvent from '#models/sojalink_event'

export default class ListRulesWithStats {
  static async handle() {
    const since = DateTime.utc().minus({ hours: 24 })

    const [rules, processedLast24h, failedLast24h] = await Promise.all([
      SojalinkRule.query()
        .preload('eventType')
        .preload('versions', (query) => query.orderBy('versionNumber', 'desc'))
        .orderBy('priority', 'asc'),
      SojalinkEvent.query()
        .where('status', 'processed')
        .where('processedAt', '>=', since.toSQL()!)
        .count('* as total'),
      SojalinkEvent.query()
        .where('status', 'failed')
        .where('failedAt', '>=', since.toSQL()!)
        .count('* as total'),
    ])

    return {
      rules,
      stats: {
        totalRules: rules.length,
        activeRules: rules.filter((rule) => rule.isActive).length,
        processedLast24h: Number(processedLast24h[0].$extras.total),
        failedLast24h: Number(failedLast24h[0].$extras.total),
      },
    }
  }
}
