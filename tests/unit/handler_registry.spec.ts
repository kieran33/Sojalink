import { test } from '@japa/runner'
import { HandlerRegistry } from '#application/handlers/handler_registry'
import { EmailNotificationHandler } from '#application/handlers/email_notification_handler'
import { HandlerNotFoundError } from '#domain/events/errors'
import type { HandlerContext } from '#domain/events/handler'

function createRegistry() {
  return new HandlerRegistry(new EmailNotificationHandler())
}

function createHandlerContext(input: Record<string, unknown> = {}): HandlerContext {
  return {
    event: {
      id: 1,
      sourceApp: 'SojadisPro',
      sourceEntityType: 'worksheet',
      sourceEntityId: 95,
      payload: { id: 1 },
    },
    input,
    steps: {},
  }
}

test.group('HandlerRegistry', () => {
  test('resolves a registered handler by name', ({ assert }) => {
    const handler = createRegistry().resolve('email_notification')

    assert.instanceOf(handler, EmailNotificationHandler)
  })

  test('knows which handler names are registered', ({ assert }) => {
    const registry = createRegistry()

    assert.isTrue(registry.has('email_notification'))
    assert.isFalse(registry.has('unknown_handler'))
  })

  test('throws a HandlerNotFoundError for an unknown handler', ({ assert }) => {
    assert.throws(
      () => createRegistry().resolve('unknown_handler'),
      'Handler "unknown_handler" is not registered'
    )

    try {
      createRegistry().resolve('unknown_handler')
    } catch (error) {
      assert.instanceOf(error, HandlerNotFoundError)
      assert.equal((error as Error).name, 'HandlerNotFoundError')
    }
  })
})

test.group('EmailNotificationHandler', () => {
  test('returns a small JSON output on success', async ({ assert }) => {
    const handler = new EmailNotificationHandler()

    const output = await handler.execute(createHandlerContext({ message: 'hello' }))

    assert.deepEqual(output, { sent: true })
  })
})
