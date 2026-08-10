/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  login: {
    show: typeof routes['login.show']
    store: typeof routes['login.store']
  }
  logout: typeof routes['logout']
  register: {
    show: typeof routes['register.show']
    store: typeof routes['register.store']
  }
  dashboard: typeof routes['dashboard']
  rules: {
    show: typeof routes['rules.show']
  }
}
