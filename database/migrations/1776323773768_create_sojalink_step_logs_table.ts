import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sojalink_step_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
      table
        .bigInteger('attempt_id')
        .unsigned()
        .references('id')
        .inTable('sojalink_attempts')
        .notNullable()
      table.integer('step_index').notNullable()
      table.string('step_code').notNullable()
      table.string('handler_key').notNullable()
      table.string('status').notNullable()
      table.json('input_json').notNullable()
      table.json('output_json').nullable()
      table.string('error_code').nullable()
      table.text('error_message').nullable()
      table.datetime('started_at').notNullable()
      table.datetime('finished_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
