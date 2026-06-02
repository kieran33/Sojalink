import { BaseSeeder } from '@adonisjs/lucid/seeders'
import SojalinkEvent from '#models/sojalink_event'
import SojalinkEventType from '#models/sojalink_event_type'
import SojalinkRuleVersion from '#models/sojalink_rule_version'

export default class SojalinkEventSeeder extends BaseSeeder {
  async run() {
    const eventType = await SojalinkEventType.query().orderBy('id', 'desc').firstOrFail()
    const appliedRuleVersion = await SojalinkRuleVersion.query().orderBy('id', 'desc').firstOrFail()
    await SojalinkEvent.updateOrCreateMany(
      ['sourceApp', 'sourceEntityType', 'sourceEntityId', 'eventTypeId'],
      [
        {
          eventTypeId: eventType.id,
          sourceApp: 'SojadisPro',
          sourceEntityType: 'worksheet',
          sourceEntityId: 'worksheet-test',
          status: 'pending',
          payloadJson: JSON.stringify({ id: 1, name: 'test' }),
          appliedRuleVersionId: appliedRuleVersion.id,
          resolutionSnapshotJson: JSON.stringify({ id: 1, name: 'test' }),
          processingStartedAt: null,
          processedAt: null,
        },
      ]
    )
  }
}
