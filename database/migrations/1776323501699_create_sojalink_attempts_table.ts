import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sojalink_attempts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
      table
        .bigInteger('event_id')
        .unsigned()
        .references('id')
        .inTable('sojalink_events')
        .unique()
        .notNullable()
      table.integer('attempt_number').unique().notNullable()
      table.string('status').notNullable()
      table.string('error_code').notNullable()
      table.text('error_message').notNullable()
      table.datetime('started_at').notNullable()
      table.datetime('finished_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
