import { BaseSeeder } from '@adonisjs/lucid/seeders'
import SojalinkEventType from '#models/sojalink_event_type'

export default class SojalinkEventTypeSeeder extends BaseSeeder {
  async run() {
    await SojalinkEventType.updateOrCreateMany('code', [
      { code: 'sojadispro.order.created', label: 'Commande SojadisPro créée', isActive: true },
    ])
  }
}
