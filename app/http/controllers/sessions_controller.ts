import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { loginValidator } from '#http/validators/auth'
import { LoginAttemptsRepository } from '#persistence/events/auth/login_attempts_repository'
import { inject } from '@adonisjs/core'

@inject()
export default class SessionsController {
  constructor(private loginAttemptsRepository: LoginAttemptsRepository) {}

  async show({ inertia }: HttpContext) {
    return inertia.render('auth/login', {})
  }

  async store({ request, auth, response, session }: HttpContext) {
    const { username, password } = await request.validateUsing(loginValidator)

    if (await this.loginAttemptsRepository.isLocked(username)) {
      session.flash('error', 'Trop de tentatives échouées, veuillez réessayer plus tard.')
      return response.redirect().back()
    }

    const user = await User.verifyCredentials(username, password).catch(() => null)

    if (!user) {
      await this.loginAttemptsRepository.registerFailedAttempt(username)
      session.flash('error', 'Informations de connexion incorrect, veuillez réessayer.')
      return response.redirect().back()
    }

    await this.loginAttemptsRepository.registerSuccessfulLogin(username)
    await auth.use('web').login(user)

    return response.redirect().toPath('/dashboard')
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.redirect().toPath('/connexion')
  }
}
