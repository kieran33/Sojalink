import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { selectDisplayedVersion, selectRecentEvents } from '#http/transformers/rule_transformer'

test.group('select displayed version', () => {
  test('picks the active version when one exists', ({ assert }) => {
    const versions = [
      { id: 1, versionNumber: 2, isActive: false },
      { id: 2, versionNumber: 1, isActive: true },
    ] as any

    assert.equal(selectDisplayedVersion(versions)?.id, 2)
  })

  test('falls back to the first version when none is active', ({ assert }) => {
    const versions = [
      { id: 1, versionNumber: 3, isActive: false },
      { id: 2, versionNumber: 2, isActive: false },
    ] as any

    assert.equal(selectDisplayedVersion(versions)?.id, 1)
  })

  test('returns undefined for an empty version list', ({ assert }) => {
    assert.isUndefined(selectDisplayedVersion([]))
  })
})

test.group('select recent events', () => {
  const eventAt = (id: number, hoursAgo: number) => ({
    id,
    createdAt: DateTime.utc().minus({ hours: hoursAgo }),
  })

  test('merges events across every version, most recent first', ({ assert }) => {
    const versions = [
      { id: 1, appliedEvents: [eventAt(1, 5), eventAt(2, 1)] },
      { id: 2, appliedEvents: [eventAt(3, 3)] },
    ] as any

    const events = selectRecentEvents(versions)

    assert.deepEqual(
      events.map((event: any) => event.id),
      [2, 3, 1]
    )
  })

  test('limits the result to the given limit', ({ assert }) => {
    const versions = [
      { id: 1, appliedEvents: [eventAt(1, 4), eventAt(2, 3), eventAt(3, 2), eventAt(4, 1)] },
    ] as any

    const events = selectRecentEvents(versions, 2)

    assert.deepEqual(
      events.map((event: any) => event.id),
      [4, 3]
    )
  })

  test('returns an empty array when no version has events', ({ assert }) => {
    const versions = [{ id: 1, appliedEvents: [] }] as any

    assert.deepEqual(selectRecentEvents(versions), [])
  })
})
