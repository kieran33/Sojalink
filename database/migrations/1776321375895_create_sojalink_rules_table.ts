import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sojalink_rules'

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
      table.string('code').notNullable().index()
      table.string('label').notNullable().index()
      table.integer('priority').notNullable().index()
      table.boolean('is_active').notNullable().index()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
