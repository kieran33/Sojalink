import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sojalink_rule_versions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('rule_id')
        .unsigned()
        .references('id')
        .inTable('sojalink_rules')
        .notNullable()
        .index()

      table.integer('version_number').notNullable()
      table.boolean('is_active').notNullable().defaultTo(false).index()
      table.text('conditions_json').notNullable()
      table.text('pipeline_json').notNullable()

      table.datetime('created_at').notNullable().defaultTo(this.now())
      table.datetime('updated_at').nullable()

      table.unique(['rule_id', 'version_number'], {
        indexName: 'sojalink_rule_versions_unique_rule_version',
      })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
