import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sojalink_entity_correlations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
      table.string('source_app').unique().notNullable()
      table.string('source_entity_type').unique().notNullable()
      table.string('source_entity_id').unique().notNullable()
      table.string('target_app').unique().notNullable()
      table.string('target_entity_type').unique().notNullable()
      table.string('target_entity_id').notNullable()
      table.string('correlation_key').notNullable()
      table.bigInteger('created_by_event_id').notNullable()
      table.datetime('created_at').notNullable()
      table.datetime('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
