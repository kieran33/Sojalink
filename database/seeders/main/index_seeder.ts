import { BaseSeeder } from '@adonisjs/lucid/seeders'
import SojalinkEventTypeSeeder from '#database/seeders/sojalink_event_type_seeder'
import SojalinkRuleSeeder from '#database/seeders/sojalink_rule_seeder'
import SojalinkRuleVersionSeeder from '#database/seeders/sojalink_rule_version_seeder'
import SojalinkEventSeeder from '#database/seeders/sojalink_event_seeder'

export default class SojalinkInitialSeeder extends BaseSeeder {
  async run() {
    await new SojalinkEventTypeSeeder(this.client).run()
    await new SojalinkRuleSeeder(this.client).run()
    await new SojalinkRuleVersionSeeder(this.client).run()
    await new SojalinkEventSeeder(this.client).run()
  }
}
