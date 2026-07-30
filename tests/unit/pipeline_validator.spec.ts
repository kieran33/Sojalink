import { test } from '@japa/runner'
import { PipelineValidator } from '#application/events/pipeline_validator'
import { HandlerRegistry } from '#application/handlers/handler_registry'
import { EmailNotificationHandler } from '#application/handlers/email_notification_handler'
import { PipelineValidationError } from '#domain/events/errors'

function createValidator() {
  return new PipelineValidator(new HandlerRegistry(new EmailNotificationHandler()))
}

test.group('PipelineValidator', () => {
  test('accepts a valid single-step pipeline', ({ assert }) => {
    const pipeline = createValidator().validate(
      JSON.stringify({ steps: [{ key: 'notify_team', handler: 'email_notification' }] })
    )

    assert.deepEqual(pipeline, {
      steps: [{ key: 'notify_team', handler: 'email_notification' }],
    })
  })

  test('rejects pipeline_json that is not valid JSON', ({ assert }) => {
    assert.throws(() => createValidator().validate('not json'), PipelineValidationError)
  })

  test('rejects a pipeline without a "steps" array', ({ assert }) => {
    assert.throws(
      () => createValidator().validate(JSON.stringify({ notSteps: [] })),
      'Pipeline must declare at least one step'
    )
  })

  test('rejects a pipeline with an empty "steps" array', ({ assert }) => {
    assert.throws(
      () => createValidator().validate(JSON.stringify({ steps: [] })),
      'Pipeline must declare at least one step'
    )
  })

  test('rejects a step without a "key"', ({ assert }) => {
    assert.throws(
      () =>
        createValidator().validate(JSON.stringify({ steps: [{ handler: 'email_notification' }] })),
      'has no "key"'
    )
  })

  test('rejects duplicate step keys', ({ assert }) => {
    assert.throws(
      () =>
        createValidator().validate(
          JSON.stringify({
            steps: [
              { key: 'notify_team', handler: 'email_notification' },
              { key: 'notify_team', handler: 'email_notification' },
            ],
          })
        ),
      'Duplicate step key "notify_team"'
    )
  })

  test('rejects a step without a "handler"', ({ assert }) => {
    assert.throws(
      () => createValidator().validate(JSON.stringify({ steps: [{ key: 'notify_team' }] })),
      'has no "handler"'
    )
  })

  test('rejects a step referencing an unregistered handler', ({ assert }) => {
    assert.throws(
      () =>
        createValidator().validate(
          JSON.stringify({ steps: [{ key: 'notify_team', handler: 'unknown_handler' }] })
        ),
      'references unknown handler "unknown_handler"'
    )
  })

  test('rejects a step whose input is not a JSON object', ({ assert }) => {
    assert.throws(
      () =>
        createValidator().validate(
          JSON.stringify({
            steps: [{ key: 'notify_team', handler: 'email_notification', input: ['nope'] }],
          })
        ),
      'input must be a JSON object'
    )
  })

  test('rejects a step referencing a step that has not run yet', ({ assert }) => {
    assert.throws(
      () =>
        createValidator().validate(
          JSON.stringify({
            steps: [
              {
                key: 'first_step',
                handler: 'email_notification',
                input: { value: '{{ steps.second_step.sent }}' },
              },
              { key: 'second_step', handler: 'email_notification' },
            ],
          })
        ),
      'not a previous step'
    )
  })

  test('accepts a step referencing an earlier step output', ({ assert }) => {
    const pipeline = createValidator().validate(
      JSON.stringify({
        steps: [
          { key: 'first_step', handler: 'email_notification' },
          {
            key: 'second_step',
            handler: 'email_notification',
            input: { value: '{{ steps.first_step.sent }}' },
          },
        ],
      })
    )

    assert.lengthOf(pipeline.steps, 2)
  })
})
