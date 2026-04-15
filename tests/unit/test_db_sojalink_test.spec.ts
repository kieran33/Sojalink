import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'

test.group('Sanity check', () => {
  test('Check if database sojalink_test is configured correctly with env variable', async ({
    assert,
  }) => {
    assert.equal(process.env.DB_DATABASE, 'sojalink_test')
    console.log(process.env.DB_DATABASE)
  })

  test('Check if database sojalink_test is used correctly with mysql request', async ({
    assert,
  }) => {
    const result = await db.rawQuery('SELECT DATABASE() as db_name')
    assert.equal(result[0][0].db_name, 'sojalink_test')
    console.log(result)
  })
})
