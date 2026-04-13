import { test } from '@japa/runner'

test.group('Test launch', () => {
  test('test commande node ace test', async ({ assert }) => {
    console.log('DB utilisée :', process.env.DB_DATABASE)
  })
})
