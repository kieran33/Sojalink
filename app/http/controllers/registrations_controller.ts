import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { registerValidator } from '#http/validators/auth'

export default class RegistrationsController {
  async show({ inertia }: HttpContext) {
    return inertia.render('auth/register', {})
  }

  async store({ request, auth, response, session }: HttpContext) {
    const { username, password } = await request.validateUsing(registerValidator)

    const existingUser = await User.findBy('username', username)

    if (existingUser) {
      session.flash('error', "Ce nom d'utilisateur est déjà pris.")
      return response.redirect().back()
    }

    const user = await User.create({ username, password })

    await auth.use('web').login(user)

    return response.redirect().toPath('/dashboard')
  }
}
