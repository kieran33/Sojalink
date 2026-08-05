import { getByPath } from '#application/events/object_path'

export function evaluateRuleConditions(
  conditions: unknown,
  context: Record<string, unknown>
): boolean {
  if (!conditions || typeof conditions !== 'object') {
    return false
  }

  const condition = conditions as Record<string, unknown>

  if (condition.op === 'eq' && typeof condition.field === 'string') {
    return getByPath(context, condition.field) === condition.value
  }

  if (Array.isArray(condition.all)) {
    return condition.all.every((item) => evaluateRuleConditions(item, context))
  }

  return false
}
