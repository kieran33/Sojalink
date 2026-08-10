/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

router.get('/connexion', [controllers.Sessions, 'show']).as('login.show').use(middleware.guest())
router.post('/connexion', [controllers.Sessions, 'store']).as('login.store').use(middleware.guest())
router.post('/deconnexion', [controllers.Sessions, 'destroy']).as('logout').use(middleware.auth())

router
  .get('/inscription', [controllers.Registrations, 'show'])
  .as('register.show')
  .use(middleware.guest())
router
  .post('/inscription', [controllers.Registrations, 'store'])
  .as('register.store')
  .use(middleware.guest())

router.on('/').redirectToPath('/dashboard')
router.get('/dashboard', [controllers.Dashboard, 'index']).as('dashboard').use(middleware.auth())
router.get('/rules/:id', [controllers.Rules, 'show']).as('rules.show').use(middleware.auth())
