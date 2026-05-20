import { BaseSeeder } from '@adonisjs/lucid/seeders'
import SojalinkEventTypeSeeder from '../sojalink_event_type_seeder.ts'
import SojalinkRuleSeeder from '../sojalink_rule_seeder.ts'
import SojalinkRuleVersionSeeder from '../sojalink_rule_version_seeder.ts'

export default class SojalinkInitialSeeder extends BaseSeeder {
  async run() {
    await new SojalinkEventTypeSeeder(this.client).run()
    await new SojalinkRuleSeeder(this.client).run()
    await new SojalinkRuleVersionSeeder(this.client).run()
  }
}
