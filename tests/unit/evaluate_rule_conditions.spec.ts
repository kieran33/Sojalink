import { test } from '@japa/runner'
import { evaluateRuleConditions } from '#application/events/evaluate_rule_conditions'

test.group('evaluateRuleConditions', () => {
  test('condition eq matches an equal value', ({ assert }) => {
    const result = evaluateRuleConditions(
      {
        op: 'eq',
        field: 'sourceApp',
        value: 'sojadispro',
      },
      { sourceApp: 'sojadispro' }
    )

    assert.isTrue(result)
  })

  test('condition eq rejects a different value', ({ assert }) => {
    const result = evaluateRuleConditions(
      {
        op: 'eq',
        field: 'sourceApp',
        value: 'sojadispro',
      },
      { sourceApp: 'random_app' }
    )

    assert.isFalse(result)
  })

  test('condition eq reads nested payload paths', ({ assert }) => {
    const result = evaluateRuleConditions(
      {
        op: 'eq',
        field: 'payload.source_app',
        value: 'sojadispro',
      },
      { payload: { source_app: 'sojadispro' } }
    )

    assert.isTrue(result)
  })

  test('condition on an unknown field evaluates to false', ({ assert }) => {
    const result = evaluateRuleConditions(
      {
        op: 'eq',
        field: 'unexpected_field',
        value: 'sojadispro',
      },
      { sourceApp: 'sojadispro' }
    )

    assert.isFalse(result)
  })

  test('malformed conditions evaluate to false', ({ assert }) => {
    const result = evaluateRuleConditions('invalid json here' as never, {
      sourceApp: 'sojadispro',
    })

    assert.isFalse(result)
  })

  test('condition all requires every nested condition to match', ({ assert }) => {
    const conditions = {
      all: [
        { op: 'eq', field: 'sourceApp', value: 'sojadispro' },
        { op: 'eq', field: 'payload.status', value: 'paid' },
      ],
    }

    assert.isTrue(
      evaluateRuleConditions(conditions, {
        sourceApp: 'sojadispro',
        payload: { status: 'paid' },
      })
    )

    assert.isFalse(
      evaluateRuleConditions(conditions, {
        sourceApp: 'sojadispro',
        payload: { status: 'draft' },
      })
    )
  })
})
