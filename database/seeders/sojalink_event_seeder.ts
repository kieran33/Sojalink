import { BaseSeeder } from '@adonisjs/lucid/seeders'
import SojalinkEvent from '#models/sojalink_event'
import SojalinkEventType from '#models/sojalink_event_type'

export default class SojalinkEventSeeder extends BaseSeeder {
  async run() {
    const eventType = await SojalinkEventType.query().orderBy('id', 'desc').firstOrFail()
    await SojalinkEvent.updateOrCreateMany(
      ['sourceApp', 'sourceEntityType', 'sourceEntityId', 'eventTypeId'],
      [
        {
          eventTypeId: eventType.id,
          sourceApp: 'SojadisPro',
          sourceEntityType: 'worksheet',
          sourceEntityId: 95,
          status: 'pending',
          payloadJson: JSON.stringify({ id: 1, name: 'test' }),
          appliedRuleVersionId: null,
          resolutionSnapshotJson: null,
          processingStartedAt: null,
          processedAt: null,
        },
      ]
    )
  }
}
