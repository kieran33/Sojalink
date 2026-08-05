import logger from '@adonisjs/core/services/logger'
import type { HandlerContext, HandlerOutput, StepHandler } from '#domain/events/handler'

export class EmailNotificationHandler implements StepHandler {
  async execute(context: HandlerContext): Promise<HandlerOutput> {
    logger.info({ eventId: context.event.id, input: context.input }, 'Email notification sent')

    return { sent: true }
  }
}
