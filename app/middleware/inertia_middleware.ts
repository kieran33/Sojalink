import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'
import { inject } from '@adonisjs/core'
import GetWorkerHealth from '#http/actions/dashboard/get_worker_health'

@inject()
export default class InertiaMiddleware extends BaseInertiaMiddleware {
  constructor(private getWorkerHealth: GetWorkerHealth) {
    super()
  }

  async share(ctx: HttpContext) {
    const { session, auth } = ctx as Partial<HttpContext>

    const error = session?.flashMessages.get('error') as string
    const success = session?.flashMessages.get('success') as string

    return {
      errors: ctx.inertia.always(this.getValidationErrors(ctx)),
      flash: ctx.inertia.always({
        error,
        success,
      }),
      user: ctx.inertia.always(auth?.user ? { username: auth.user.username } : undefined),
      worker: ctx.inertia.always(await this.getWorkerHealth.handle()),
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)

    const output = await next()
    this.dispose(ctx)

    return output
  }
}

declare module '@adonisjs/inertia/types' {
  type MiddlewareSharedProps = InferSharedProps<InertiaMiddleware>
  export interface SharedProps extends MiddlewareSharedProps {}
}
