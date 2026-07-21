import type { DateTime } from 'luxon'

export type RuleVersion = {
  id: number
  ruleId: number
  versionNumber: number
  isActive: boolean
  conditionsJson: string
  pipelineJson: string
  createdAt: DateTime
  updatedAt: DateTime | null
}
