import { test } from '@japa/runner'
import { selectDisplayedVersion } from '#http/transformers/rule_transformer'

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
