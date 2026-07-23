import { getByPath } from '#application/events/object_path'

/**
 * Evaluates the `conditions_json` of a rule version against the event context.
 *
 * Supported shapes:
 * - { "op": "eq", "field": "sourceApp", "value": "SojadisPro" }
 * - { "all": [condition, condition, ...] }
 *
 * Malformed or unsupported conditions evaluate to `false`: the rule is
 * simply not applicable (see docs/rule_resolver.md).
 */
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
