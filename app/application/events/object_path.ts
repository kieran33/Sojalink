/**
 * Reads a nested value from an object using a dot-separated path.
 * Returns `undefined` when any segment of the path does not exist.
 */
export function getByPath(source: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') {
      return undefined
    }

    return (current as Record<string, unknown>)[key]
  }, source)
}
