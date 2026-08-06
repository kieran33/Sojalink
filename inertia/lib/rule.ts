import { type Data } from '@generated/data'

export type RuleShowData = Data.Rule.Variants['forShowPage']
export type RuleVersion = RuleShowData['versions'][number]
export type RuleEvent = NonNullable<RuleVersion['events']>[number]
export type RuleAttempt = NonNullable<RuleEvent['attempts']>[number]
export type RuleStepLog = NonNullable<RuleAttempt['stepLogs']>[number]

// Shape of `conditions_json`, see docs/rule_resolver.md — a leaf is a terminal
// check (e.g. { op: "eq", field: "sourceApp", value: "SojadisPro" }), `all`
// groups nested conditions that must all be true.
type LeafCondition = { op: string; field: string; value: unknown }
type AllCondition = { all: Condition[] }
type Condition = LeafCondition | AllCondition

type PipelineStep = { key: string; handler: string; input?: Record<string, unknown> }
export type Pipeline = { steps: PipelineStep[] }

function isAllCondition(condition: unknown): condition is AllCondition {
  return (
    typeof condition === 'object' &&
    condition !== null &&
    Array.isArray((condition as AllCondition).all)
  )
}

function isLeafCondition(condition: unknown): condition is LeafCondition {
  return (
    typeof condition === 'object' &&
    condition !== null &&
    'field' in condition &&
    'value' in condition
  )
}

export function isPipeline(pipeline: unknown): pipeline is Pipeline {
  return (
    typeof pipeline === 'object' && pipeline !== null && Array.isArray((pipeline as Pipeline).steps)
  )
}

export function flattenConditions(condition: unknown): LeafCondition[] | null {
  if (isAllCondition(condition)) {
    const leaves: LeafCondition[] = []
    for (const child of condition.all) {
      const childLeaves = flattenConditions(child)
      if (!childLeaves) return null
      leaves.push(...childLeaves)
    }
    return leaves
  }

  if (isLeafCondition(condition)) {
    return [condition]
  }

  return null
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(value: string | null | undefined) {
  return value ? dateFormatter.format(new Date(value)) : '—'
}

export function eventTreatedAt(event: RuleEvent) {
  return event.processedAt ?? event.failedAt ?? null
}

export function eventBadgeVariant(status: RuleEvent['status']) {
  return status === 'failed' ? 'destructive' : 'secondary'
}

const ATTEMPT_STATUS_LABELS: Record<RuleAttempt['status'], string> = {
  active: 'En cours',
  success: 'Réussi',
  failed: 'Échec',
}

export function attemptStatusLabel(status: RuleAttempt['status']) {
  return ATTEMPT_STATUS_LABELS[status]
}

export function attemptBadgeVariant(status: RuleAttempt['status']) {
  if (status === 'failed') return 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
  if (status === 'success')
    return 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
  return 'secondary'
}

export function formatDuration(startedAt: string | null, finishedAt: string | null) {
  if (!startedAt || !finishedAt) return null
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  if (ms < 1000) return `${ms} ms`
  const seconds = ms / 1000
  return seconds < 60 ? `${seconds.toFixed(1)} s` : `${Math.round(seconds / 60)} min`
}

export function computeEventStats(events: RuleEvent[]) {
  const processed = events.filter((event) => event.status === 'processed').length
  const failed = events.filter((event) => event.status === 'failed').length
  const settled = processed + failed
  const successRate = settled > 0 ? Math.round((processed / settled) * 100) : null

  return { processed, failed, successRate }
}
