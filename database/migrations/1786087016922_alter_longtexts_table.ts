import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('sojalink_rule_versions', (table) => {
      table.text('conditions_json', 'longtext').notNullable().alter()
      table.text('pipeline_json', 'longtext').notNullable().alter()
    })

    this.schema.alterTable('sojalink_events', (table) => {
      table.text('payload_json', 'longtext').notNullable().alter()
      table.text('resolution_snapshot_json', 'longtext').nullable().alter()
    })

    this.schema.alterTable('sojalink_step_logs', (table) => {
      table.text('input_json', 'longtext').notNullable().alter()
      table.text('output_json', 'longtext').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable('sojalink_rule_versions', (table) => {
      table.text('conditions_json').notNullable().alter()
      table.text('pipeline_json').notNullable().alter()
    })

    this.schema.alterTable('sojalink_events', (table) => {
      table.text('payload_json').notNullable().alter()
      table.text('resolution_snapshot_json').nullable().alter()
    })

    this.schema.alterTable('sojalink_step_logs', (table) => {
      table.text('input_json').notNullable().alter()
      table.text('output_json').nullable().alter()
    })
  }
}
