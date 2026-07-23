import { BaseSeeder } from '@adonisjs/lucid/seeders'
import SojalinkRule from '#models/sojalink_rule'
import SojalinkEventType from '#models/sojalink_event_type'

export default class SojalinkRuleSeeder extends BaseSeeder {
  async run() {
    const eventType = await SojalinkEventType.findByOrFail('code', 'sojadispro.order.created')

    await SojalinkRule.updateOrCreateMany('code', [
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
