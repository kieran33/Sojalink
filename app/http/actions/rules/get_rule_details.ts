import SojalinkRule from '#models/sojalink_rule'

export default class GetRuleDetails {
  static async handle(ruleId: number) {
    return SojalinkRule.query()
      .where('id', ruleId)
      .preload('eventType')
      .preload('versions', (versionsQuery) => {
        versionsQuery.orderBy('versionNumber', 'desc').preload('appliedEvents', (eventsQuery) => {
          eventsQuery.orderBy('createdAt', 'desc').preload('attempts', (attemptsQuery) => {
            attemptsQuery
              .orderBy('attemptNumber', 'asc')
              .preload('stepLogs', (stepLogsQuery) => stepLogsQuery.orderBy('stepIndex', 'asc'))
          })
        })
      })
      .firstOrFail()
  }
}
