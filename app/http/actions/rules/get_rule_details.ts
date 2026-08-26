import SojalinkRule from '#models/sojalink_rule'
import SojalinkEvent from '#models/sojalink_event'

const NO_MATCH_DEMO_RULE_CODE = 'rule-no-match'

export default class GetRuleDetails {
  static async handle(ruleId: number) {
    const rule = await SojalinkRule.query()
      .where('id', ruleId)
      .preload('eventType')
      .preload('versions', (versionsQuery) => {
        versionsQuery.orderBy('versionNumber', 'desc').preload('appliedEvents', (eventsQuery) => {
          eventsQuery
            .orderBy('createdAt', 'desc')
            .preload('eventType')
            .preload('attempts', (attemptsQuery) => {
              attemptsQuery
                .orderBy('attemptNumber', 'asc')
                .preload('stepLogs', (stepLogsQuery) => stepLogsQuery.orderBy('stepIndex', 'asc'))
            })
        })
      })
      .firstOrFail()

    if (rule.code === NO_MATCH_DEMO_RULE_CODE) {
      const unattributedEvents = await SojalinkEvent.query()
        .where('eventTypeId', rule.eventTypeId)
        .whereNull('appliedRuleVersionId')
        .where('status', 'failed')
        .preload('eventType')
        .orderBy('createdAt', 'desc')

      const displayedVersion = rule.versions.find((version) => version.isActive) ?? rule.versions[0]

      if (displayedVersion && unattributedEvents.length > 0) {
        const merged = [...displayedVersion.appliedEvents, ...unattributedEvents].sort(
          (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
        )
        displayedVersion.appliedEvents = merged as unknown as typeof displayedVersion.appliedEvents
      }
    }

    return rule
  }
}
