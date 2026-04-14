import { test } from '@japa/runner'

test.group('Sanity check', () => {
  test('Database test is used', async ({ assert }) => {
    assert.equal(process.env.DB_DATABASE, 'sojalink_test')
  })
})
