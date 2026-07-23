/**
 * A rule candidate for resolution: an active rule with its latest
 * active version, whose conditions are already parsed.
 */
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
