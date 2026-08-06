import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sojalink_step_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('attempt_id')
        .unsigned()
        .references('id')
        .inTable('sojalink_attempts')
        .notNullable()
        .index()

      table.integer('step_index').notNullable()
      table.string('step_code', 100).notNullable().index()
      table.string('handler_name', 100).notNullable()
      table.string('status', 100).notNullable().index()
      table.text('input_json', 'longtext').notNullable()
      table.text('output_json', 'longtext').nullable()
      table.string('error_code', 100).nullable()
      table.text('error_message').nullable()
      table.datetime('started_at').notNullable().defaultTo(this.now())
      table.datetime('finished_at').nullable()

      table.unique(['attempt_id', 'step_index'], {
        indexName: 'sojalink_step_logs_unique_attempt_step',
      })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
