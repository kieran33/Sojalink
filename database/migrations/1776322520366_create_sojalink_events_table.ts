import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sojalink_events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('event_type_id')
        .unsigned()
        .references('id')
        .inTable('sojalink_event_types')
        .notNullable()
        .index()

      table.string('source_app', 100).notNullable().index()
      table.string('source_entity_type', 100).notNullable()
      table.integer('source_entity_id').notNullable()

      table.unique(['source_app', 'source_entity_type', 'source_entity_id', 'event_type_id'], {
        indexName: 'sojalink_events_unique_source_event',
      })

      table.string('status', 100).notNullable().index()
      table.text('payload_json').notNullable()

      table
        .integer('applied_rule_version_id')
        .unsigned()
        .references('id')
        .inTable('sojalink_rule_versions')
        .nullable()
        .index()

      table.text('resolution_snapshot_json').nullable()
      table.string('resolution_error_code', 100).nullable().index()
      table.text('resolution_error_message').nullable()

      table.datetime('created_at').notNullable().defaultTo(this.now()).index()
      table.datetime('updated_at').nullable()
      table.datetime('processing_started_at').nullable()
      table.datetime('resolved_at').nullable()
      table.datetime('processed_at').nullable()
      table.datetime('failed_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
