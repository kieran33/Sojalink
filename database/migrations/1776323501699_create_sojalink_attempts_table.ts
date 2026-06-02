import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sojalink_attempts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('event_id')
        .unsigned()
        .references('id')
        .inTable('sojalink_events')
        .notNullable()
        .index()
      table.integer('attempt_number').notNullable().index()
      table.string('status').notNullable().index()
      table.string('error_code').nullable()
      table.text('error_message').nullable()
      table.timestamp('started_at').notNullable().defaultTo(this.now())
      table.timestamp('finished_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
