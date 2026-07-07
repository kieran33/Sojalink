import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sojalink_entity_correlations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('source_app').notNullable()
      table.string('source_entity_type').notNullable()
      table.string('source_entity_id').notNullable()
      table.string('target_app').notNullable()
      table.string('target_entity_type').notNullable()
      table.string('target_entity_id').notNullable()
      table.string('correlation_key').notNullable().unique()
      table
        .integer('created_by_event_id')
        .unsigned()
        .references('id')
        .inTable('sojalink_events')
        .notNullable()
        .index()
      table.datetime('created_at').notNullable().defaultTo(this.now())
      table.datetime('updated_at').nullable()

      table.unique(
        [
          'source_app',
          'source_entity_type',
          'source_entity_id',
          'target_app',
          'target_entity_type',
        ],
        { indexName: 'sojalink_entity_correlations_unique' }
      )
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
