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

      table.integer('attempt_number').notNullable()
      table.string('status', 100).notNullable().index()
      table.string('error_code', 100).nullable()
      table.text('error_message').nullable()
      table.datetime('started_at').notNullable().defaultTo(this.now())
      table.datetime('finished_at').nullable()

      table.unique(['event_id', 'attempt_number'], {
        indexName: 'sojalink_attempts_unique_event_attempt',
      })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
