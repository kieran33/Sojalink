/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  dashboard: typeof routes['dashboard']
  rules: {
    show: typeof routes['rules.show']
  }
}
