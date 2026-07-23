import { inject } from '@adonisjs/core'
import type { StepHandler } from '#domain/events/handler'
import { HandlerNotFoundError } from '#domain/events/errors'
import { EmailNotificationHandler } from '#application/handlers/email_notification_handler'

/**
 * Maps a handler name used in `pipeline_json` to its implementation.
 *
 * Adding a handler:
 * 1. create a class implementing StepHandler in app/application/handlers/
 * 2. inject it in the constructor and add it to the map below
 * The engine itself (executor, validator) never has to change.
 */
@inject()
export class HandlerRegistry {
  private readonly handlers: Record<string, StepHandler>

  constructor(emailNotificationHandler: EmailNotificationHandler) {
    this.handlers = {
      email_notification: emailNotificationHandler,
    }
  }

  has(handlerName: string): boolean {
    return handlerName in this.handlers
  }

  resolve(handlerName: string): StepHandler {
    const handler = this.handlers[handlerName]

    if (!handler) {
      throw new HandlerNotFoundError(`Handler "${handlerName}" is not registered`)
    }

    return handler
  }
}
