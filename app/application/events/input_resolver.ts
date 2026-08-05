import { InputResolutionError } from '#domain/events/errors'
import type { HandlerEvent, HandlerOutput } from '#domain/events/handler'
import { getByPath } from '#application/events/object_path'

export type InputResolutionContext = {
  event: HandlerEvent
  steps: Record<string, HandlerOutput>
}

const TEMPLATE_PATTERN = /\{\{\s*([\w.[\]-]+)\s*\}\}/g
const FULL_TEMPLATE_PATTERN = /^\{\{\s*([\w.[\]-]+)\s*\}\}$/

export function resolveStepInput(
  input: Record<string, unknown>,
  context: InputResolutionContext
): Record<string, unknown> {
  return resolveValue(input, context) as Record<string, unknown>
}

export function collectInputReferences(input: Record<string, unknown> | undefined): string[] {
  const references: string[] = []
  collectFromValue(input, references)
  return references
}

function resolveValue(value: unknown, context: InputResolutionContext): unknown {
  if (typeof value === 'string') {
    return resolveString(value, context)
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, context))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveValue(item, context)])
    )
  }

  return value
}

function resolveString(value: string, context: InputResolutionContext): unknown {
  const fullMatch = value.match(FULL_TEMPLATE_PATTERN)

  if (fullMatch) {
    return resolveReference(fullMatch[1], context)
  }

  return value.replace(TEMPLATE_PATTERN, (_, path: string) =>
    String(resolveReference(path, context))
  )
}

function resolveReference(path: string, context: InputResolutionContext): unknown {
  const root = path.split('.')[0]

  if (root !== 'event' && root !== 'steps') {
    throw new InputResolutionError(
      `Invalid reference "{{ ${path} }}": only "event.*" and "steps.*" are allowed`
    )
  }

  const resolved = getByPath(context, path)

  if (resolved === undefined) {
    throw new InputResolutionError(`Cannot resolve reference "{{ ${path} }}"`)
  }

  return resolved
}

function collectFromValue(value: unknown, references: string[]): void {
  if (typeof value === 'string') {
    for (const match of value.matchAll(TEMPLATE_PATTERN)) {
      references.push(match[1])
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectFromValue(item, references))
    return
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectFromValue(item, references))
  }
}
