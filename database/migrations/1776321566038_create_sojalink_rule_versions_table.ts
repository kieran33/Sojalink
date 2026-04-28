import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sojalink_rule_versions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
      table
        .bigInteger('rule_id')
        .unsigned()
        .references('id')
        .inTable('sojalink_rules')
        .notNullable()
        .index()
      table.integer('version_number').notNullable().index()
      table.boolean('is_active').notNullable().index()
      table.json('conditions_json').notNullable()
      table.json('pipeline_json').notNullable()
      table.datetime('created_at').notNullable()
      table.datetime('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
