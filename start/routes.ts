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

router.on('/').redirectToPath('/dashboard')
router.get('/dashboard', [controllers.Dashboard, 'index']).as('dashboard')
router.get('/rules/:id', [controllers.Rules, 'show']).as('rules.show')
