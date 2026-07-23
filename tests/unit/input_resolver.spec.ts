import { test } from '@japa/runner'
import {
  collectInputReferences,
  resolveStepInput,
  type InputResolutionContext,
} from '#application/events/input_resolver'
import { InputResolutionError } from '#domain/events/errors'

function createContext(): InputResolutionContext {
  return {
    event: {
      id: 42,
      sourceApp: 'SojadisPro',
      sourceEntityType: 'worksheet',
      sourceEntityId: 95,
      payload: { customer: { name: 'Alice Martin', email: 'alice@example.com' } },
    },
    steps: {
      create_customer: { customerId: 123 },
    },
  }
}

test.group('resolveStepInput', () => {
  test('resolves event references and keeps the referenced value type', ({ assert }) => {
    const input = {
      eventId: '{{ event.id }}',
      name: '{{ event.payload.customer.name }}',
    }

    assert.deepEqual(resolveStepInput(input, createContext()), {
      eventId: 42,
      name: 'Alice Martin',
    })
  })

  test('resolves previous step output references', ({ assert }) => {
    const input = { customerId: '{{ steps.create_customer.customerId }}' }

    assert.deepEqual(resolveStepInput(input, createContext()), { customerId: 123 })
  })

  test('interpolates references embedded in a larger string', ({ assert }) => {
    const input = { message: 'New event {{ event.id }} from {{ event.sourceApp }}' }

    assert.deepEqual(resolveStepInput(input, createContext()), {
      message: 'New event 42 from SojadisPro',
    })
  })

  test('resolves references in nested objects and arrays', ({ assert }) => {
    const input = {
      nested: { name: '{{ event.payload.customer.name }}' },
      list: ['{{ event.id }}', 'static'],
      count: 3,
    }

    assert.deepEqual(resolveStepInput(input, createContext()), {
      nested: { name: 'Alice Martin' },
      list: [42, 'static'],
      count: 3,
    })
  })

  test('leaves static values untouched', ({ assert }) => {
    const input = { source: 'sojalink', enabled: true, retries: 0 }

    assert.deepEqual(resolveStepInput(input, createContext()), input)
  })

  test('throws when a reference cannot be resolved', ({ assert }) => {
    assert.throws(
      () => resolveStepInput({ value: '{{ event.payload.missing }}' }, createContext()),
      'Cannot resolve reference "{{ event.payload.missing }}"'
    )
  })

  test('throws when the reference root is not event or steps', ({ assert }) => {
    try {
      resolveStepInput({ value: '{{ config.secret }}' }, createContext())
      assert.fail('Expected an InputResolutionError')
    } catch (error) {
      assert.instanceOf(error, InputResolutionError)
    }
  })
})

test.group('collectInputReferences', () => {
  test('collects every reference used in an input', ({ assert }) => {
    const references = collectInputReferences({
      customerId: '{{ steps.create_customer.customerId }}',
      message: 'Event {{ event.id }}',
      nested: { name: '{{ event.payload.customer.name }}' },
    })

    assert.sameMembers(references, [
      'steps.create_customer.customerId',
      'event.id',
      'event.payload.customer.name',
    ])
  })

  test('returns an empty list for an input without references', ({ assert }) => {
    assert.deepEqual(collectInputReferences({ source: 'sojalink' }), [])
    assert.deepEqual(collectInputReferences(undefined), [])
  })
})
