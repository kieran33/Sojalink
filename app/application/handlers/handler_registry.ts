import { inject } from '@adonisjs/core'
import type { StepHandler } from '#domain/events/handler'
import { HandlerNotFoundError } from '#domain/events/errors'
import { EmailNotificationHandler } from '#application/handlers/email_notification_handler'

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
