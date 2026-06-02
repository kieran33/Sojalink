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
      table.string('source_app').notNullable().index()
      table.string('source_entity_type').notNullable()
      table.string('source_entity_id').notNullable()
      table.unique(['source_app', 'source_entity_type', 'source_entity_id', 'event_type_id'], {
        indexName: 'sojalink_events_unique_source_event',
      })
      table.string('status').notNullable().index()
      table.json('payload_json').notNullable()
      table
        .integer('applied_rule_version_id')
        .unsigned()
        .references('id')
        .inTable('sojalink_rule_versions')
        .notNullable()
        .index()
      table.json('resolution_snapshot_json').notNullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now()).index()
      table.timestamp('updated_at').nullable()
      table.timestamp('processing_started_at').nullable()
      table.timestamp('processed_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
