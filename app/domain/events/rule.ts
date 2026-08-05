export type ResolvableRule = {
  id: number
  code: string
  label: string
  priority: number
  version: {
    id: number
    versionNumber: number
    conditions: unknown
  }
}
