import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sojalink_events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
      table
        .bigInteger('event_type_id')
        .unsigned()
        .references('id')
        .inTable('sojalink_event_types')
        .notNullable()
      table.string('source_app').notNullable()
      table.string('source_entity_type').notNullable()
      table.string('source_entity_id').notNullable()
      table.string('source_event_id').nullable()
      table.string('correlation_key').notNullable()
      table.string('status').notNullable()
      table.json('payload_json').notNullable()
      table
        .bigInteger('applied_rule_version_id')
        .unsigned()
        .references('id')
        .inTable('sojalink_rule_versions')
        .notNullable()
      table.json('resolution_snapshot_json').notNullable()
      table.datetime('created_at').notNullable()
      table.datetime('updated_at').nullable()
      table.datetime('occurred_at').notNullable()
      table.datetime('processing_started_at').nullable()
      table.datetime('processed_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
