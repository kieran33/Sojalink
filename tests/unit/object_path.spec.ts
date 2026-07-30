import { test } from '@japa/runner'
import { getByPath } from '#application/events/object_path'

test.group('getByPath', () => {
  test('reads a top-level value', ({ assert }) => {
    assert.equal(getByPath({ id: 42 }, 'id'), 42)
  })

  test('reads a nested value', ({ assert }) => {
    assert.equal(getByPath({ customer: { name: 'Alice' } }, 'customer.name'), 'Alice')
  })

  test('returns undefined for a missing segment', ({ assert }) => {
    assert.isUndefined(getByPath({ customer: { name: 'Alice' } }, 'customer.email'))
  })

  test('returns undefined when a path segment holds a non-object value', ({ assert }) => {
    assert.isUndefined(getByPath({ id: 42 }, 'id.nested'))
  })

  test('returns undefined for a path that does not exist in an empty source', ({ assert }) => {
    assert.isUndefined(getByPath({}, 'anything'))
  })
})
