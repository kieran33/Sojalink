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
      table.string('step_code').notNullable().index()
      table.string('handler_key').notNullable()
      table.string('status').notNullable().index()
      table.json('input_json').notNullable()
      table.json('output_json').nullable()
      table.string('error_code').nullable()
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
