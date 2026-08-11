import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { EventProcessor } from '#application/events/event_processor'
import { seedEventGraphWithPendingEvent } from '#tests/helpers/event_graph_factory'

async function processNextEvent() {
  const processor = await app.container.make(EventProcessor)

  await processor.process()
}

test.group('EventProcessor', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('does nothing when there is no pending event', async ({ assert }) => {
    await assert.doesNotReject(() => processNextEvent())
  })

  test('processes a pending event from reservation to success', async ({ assert }) => {
    const { eventId } = await seedEventGraphWithPendingEvent()

    await processNextEvent()

    const event = await db.from('sojalink_events').where('id', eventId).first()
    assert.equal(event.status, 'processed')
    assert.isNotNull(event.processing_started_at)
    assert.isNotNull(event.resolved_at)
    assert.isNotNull(event.processed_at)
    assert.isNotNull(event.applied_rule_version_id)
    assert.isNotNull(event.resolution_snapshot_json)
    assert.isNull(event.resolution_error_code)

    const attempt = await db.from('sojalink_attempts').where('event_id', eventId).first()
    assert.equal(attempt.status, 'success')
    assert.equal(attempt.attempt_number, 1)
    assert.isNotNull(attempt.finished_at)

    const stepLogs = await db.from('sojalink_step_logs').where('attempt_id', attempt.id)
    assert.lengthOf(stepLogs, 1)
    assert.equal(stepLogs[0].step_code, 'notify_team')
    assert.equal(stepLogs[0].status, 'success')

    const input = JSON.parse(stepLogs[0].input_json)
    assert.equal(input.message, `New event ${eventId} received from SojadisPro`)

    assert.deepEqual(JSON.parse(stepLogs[0].output_json), { sent: true })
  })

  test('marks the event failed when no rule matches, without creating an attempt', async ({
    assert,
  }) => {
    const { eventId } = await seedEventGraphWithPendingEvent()

    await db.from('sojalink_events').where('id', eventId).update({ source_app: 'UnknownApp' })

    await assert.doesNotReject(() => processNextEvent())

    const event = await db.from('sojalink_events').where('id', eventId).first()
    assert.equal(event.status, 'failed')
    assert.isNotNull(event.failed_at)
    assert.isNull(event.applied_rule_version_id)
    assert.equal(event.resolution_error_code, 'NoMatchingRuleError')
    assert.isNotNull(event.resolution_error_message)

    const attempts = await db.from('sojalink_attempts').where('event_id', eventId)
    assert.lengthOf(attempts, 0)
  })

  test('marks the event failed when a step fails, keeping the failure trace', async ({
    assert,
  }) => {
    const { eventId } = await seedEventGraphWithPendingEvent()

    const ruleVersion = await db.from('sojalink_rule_versions').where('is_active', 1).first()

    await db
      .from('sojalink_rule_versions')
      .where('id', ruleVersion.id)
      .update({
        pipeline_json: JSON.stringify({
          steps: [
            {
              key: 'notify_team',
              handler: 'email_notification',
              input: { value: '{{ event.payload.missing_field }}' },
            },
          ],
        }),
      })

    await assert.doesNotReject(() => processNextEvent())

    const event = await db.from('sojalink_events').where('id', eventId).first()
    assert.equal(event.status, 'failed')
    assert.isNotNull(event.failed_at)

    const attempt = await db.from('sojalink_attempts').where('event_id', eventId).first()
    assert.equal(attempt.status, 'failed')
    assert.equal(attempt.error_code, 'InputResolutionError')

    const stepLogs = await db.from('sojalink_step_logs').where('attempt_id', attempt.id)
    assert.lengthOf(stepLogs, 1)
    assert.equal(stepLogs[0].status, 'failed')
  })
})
