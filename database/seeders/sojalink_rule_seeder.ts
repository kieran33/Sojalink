import { BaseSeeder } from '@adonisjs/lucid/seeders'
import SojalinkRule from '#models/sojalink_rule'
import SojalinkEventType from '#models/sojalink_event_type'

export default class SojalinkRuleSeeder extends BaseSeeder {
  async run() {
    const eventType = await SojalinkEventType.query().orderBy('id', 'desc').firstOrFail()

    await SojalinkRule.updateOrCreateMany('eventTypeId', [
      {
        eventTypeId: eventType.id,
        code: 'sojadispro-order-to-toki-task',
        label: 'Order from SojadisPro to Toki',
        priority: 5,
        isActive: true,
      },
    ])
  }
}
