import '@adonisjs/inertia/types'

import type React from 'react'
import type { Prettify } from '@adonisjs/core/types/common'

type ExtractProps<T> =
  T extends React.FC<infer Props>
    ? Prettify<Omit<Props, 'children'>>
    : T extends React.Component<infer Props>
      ? Prettify<Omit<Props, 'children'>>
      : never

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.tsx'))['default']>
    'auth/register': ExtractProps<(typeof import('../../inertia/pages/auth/register.tsx'))['default']>
    'dashboard/index': ExtractProps<(typeof import('../../inertia/pages/dashboard/index.tsx'))['default']>
    'errors/notFound': ExtractProps<(typeof import('../../inertia/pages/errors/notFound.tsx'))['default']>
    'errors/serverError': ExtractProps<(typeof import('../../inertia/pages/errors/serverError.tsx'))['default']>
    'rules/show': ExtractProps<(typeof import('../../inertia/pages/rules/show.tsx'))['default']>
  }
}
