/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'login.show': {
    methods: ["GET","HEAD"],
    pattern: '/connexion',
    tokens: [{"old":"/connexion","type":0,"val":"connexion","end":""}],
    types: placeholder as Registry['login.show']['types'],
  },
  'login.store': {
    methods: ["POST"],
    pattern: '/connexion',
    tokens: [{"old":"/connexion","type":0,"val":"connexion","end":""}],
    types: placeholder as Registry['login.store']['types'],
  },
  'logout': {
    methods: ["POST"],
    pattern: '/deconnexion',
    tokens: [{"old":"/deconnexion","type":0,"val":"deconnexion","end":""}],
    types: placeholder as Registry['logout']['types'],
  },
  'register.show': {
    methods: ["GET","HEAD"],
    pattern: '/inscription',
    tokens: [{"old":"/inscription","type":0,"val":"inscription","end":""}],
    types: placeholder as Registry['register.show']['types'],
  },
  'register.store': {
    methods: ["POST"],
    pattern: '/inscription',
    tokens: [{"old":"/inscription","type":0,"val":"inscription","end":""}],
    types: placeholder as Registry['register.store']['types'],
  },
  'dashboard': {
    methods: ["GET","HEAD"],
    pattern: '/dashboard',
    tokens: [{"old":"/dashboard","type":0,"val":"dashboard","end":""}],
    types: placeholder as Registry['dashboard']['types'],
  },
  'rules.show': {
    methods: ["GET","HEAD"],
    pattern: '/rules/:id',
    tokens: [{"old":"/rules/:id","type":0,"val":"rules","end":""},{"old":"/rules/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['rules.show']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
