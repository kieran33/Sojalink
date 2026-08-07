import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import app from '@adonisjs/core/services/app'
import SojalinkEventTypeSeeder from '#database/seeders/sojalink_event_type_seeder'
import SojalinkRuleSeeder from '#database/seeders/sojalink_rule_seeder'
import SojalinkRuleVersionSeeder from '#database/seeders/sojalink_rule_version_seeder'
import SojalinkEventSeeder from '#database/seeders/sojalink_event_seeder'
import { EventExecutor } from '#application/events/event_executor'
import { EventRepository } from '#persistence/events/event_repository'
import type { ProcessingEvent } from '#domain/events/event'

async function seedContext() {
  const client = db.connection()
  await new SojalinkEventTypeSeeder(client).run()
  await new SojalinkRuleSeeder(client).run()
  await new SojalinkRuleVersionSeeder(client).run()
  await new SojalinkEventSeeder(client).run()

  const event = await db.from('sojalink_events').where('status', 'pending').first()
  const ruleVersion = await db.from('sojalink_rule_versions').where('is_active', 1).first()

  return { eventId: event.id, ruleVersionId: ruleVersion.id }
}

async function setEventProcessing(eventId: number, ruleVersionId: number) {
  await db.from('sojalink_events').where('id', eventId).update({
    status: 'processing',
    applied_rule_version_id: ruleVersionId,
    processing_started_at: new Date(),
  })
}

async function setPipeline(ruleVersionId: number, steps: unknown[]) {
  await db
    .from('sojalink_rule_versions')
    .where('id', ruleVersionId)
    .update({
      pipeline_json: JSON.stringify({ steps }),
    })
}

async function getProcessingEvent(eventId: number): Promise<ProcessingEvent> {
  const event = await new EventRepository().findProcessingEvent(eventId)

  if (!event) {
    throw new Error(`Expected event ${eventId} to be processing`)
  }

  return event
}

async function executeEvent(eventId: number) {
  const executor = await app.container.make(EventExecutor)

  return executor.execute(await getProcessingEvent(eventId))
}

test.group('EventExecutor', (group) => {
  group.each.setup(async () => {
    await db.from('sojalink_step_logs').delete()
    await db.from('sojalink_attempts').delete()
    await db.from('sojalink_entity_correlations').delete()
    await db.from('sojalink_events').delete()
    await db.from('sojalink_rule_versions').delete()
    await db.from('sojalink_rules').delete()
    await db.from('sojalink_event_types').delete()
  })

  test('executes a single-step pipeline and traces the attempt and step log', async ({
    assert,
  }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [{ key: 'notify_team', handler: 'email_notification' }])

    await executeEvent(eventId)

    const attempt = await db.from('sojalink_attempts').where('event_id', eventId).first()
    assert.equal(attempt.status, 'success')
    assert.equal(attempt.attempt_number, 1)
    assert.isNotNull(attempt.started_at)
    assert.isNotNull(attempt.finished_at)

    const stepLogs = await db.from('sojalink_step_logs').where('attempt_id', attempt.id)
    assert.lengthOf(stepLogs, 1)
    assert.equal(stepLogs[0].step_code, 'notify_team')
    assert.equal(stepLogs[0].handler_name, 'email_notification')
    assert.equal(stepLogs[0].status, 'success')
    assert.isNotNull(stepLogs[0].input_json)
    assert.isNotNull(stepLogs[0].output_json)
    assert.isNotNull(stepLogs[0].started_at)
    assert.isNotNull(stepLogs[0].finished_at)
  })

  test('executes multiple steps in order, one step log each', async ({ assert }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [
      { key: 'first_step', handler: 'email_notification' },
      { key: 'second_step', handler: 'email_notification' },
      { key: 'third_step', handler: 'email_notification' },
    ])

    await executeEvent(eventId)

    const attempt = await db.from('sojalink_attempts').where('event_id', eventId).first()
    assert.equal(attempt.status, 'success')

    const stepLogs = await db
      .from('sojalink_step_logs')
      .where('attempt_id', attempt.id)
      .orderBy('step_index', 'asc')
    assert.lengthOf(stepLogs, 3)
    assert.deepEqual(
      stepLogs.map((stepLog) => stepLog.step_code),
      ['first_step', 'second_step', 'third_step']
    )
  })

  test('resolves event and previous step references in step inputs', async ({ assert }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [
      { key: 'first_step', handler: 'email_notification' },
      {
        key: 'second_step',
        handler: 'email_notification',
        input: {
          eventApp: '{{ event.sourceApp }}',
          previousStepSent: '{{ steps.first_step.sent }}',
        },
      },
    ])

    await executeEvent(eventId)

    const attempt = await db.from('sojalink_attempts').where('event_id', eventId).first()
    assert.equal(attempt.status, 'success')

    const secondStepLog = await db
      .from('sojalink_step_logs')
      .where('attempt_id', attempt.id)
      .where('step_code', 'second_step')
      .first()

    assert.deepEqual(JSON.parse(secondStepLog.input_json), {
      eventApp: 'SojadisPro',
      previousStepSent: true,
    })
  })

  test('refuses to create a second active attempt for the same event', async ({ assert }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [{ key: 'notify_team', handler: 'email_notification' }])

    await db.table('sojalink_attempts').insert({
      event_id: eventId,
      attempt_number: 1,
      status: 'active',
      started_at: new Date(),
    })

    await assert.rejects(() => executeEvent(eventId), /already active/)
  })

  test('fails the step and the attempt when an input reference cannot be resolved', async ({
    assert,
  }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [
      {
        key: 'first_step',
        handler: 'email_notification',
        input: { value: '{{ event.payload.missing_field }}' },
      },
      { key: 'second_step', handler: 'email_notification' },
    ])

    await assert.rejects(() => executeEvent(eventId), /Cannot resolve reference/)

    const attempt = await db.from('sojalink_attempts').where('event_id', eventId).first()
    assert.equal(attempt.status, 'failed')
    assert.equal(attempt.error_code, 'InputResolutionError')
    assert.isNotNull(attempt.finished_at)

    const stepLogs = await db
      .from('sojalink_step_logs')
      .where('attempt_id', attempt.id)
      .orderBy('step_index', 'asc')

    assert.lengthOf(stepLogs, 1)
    assert.equal(stepLogs[0].step_code, 'first_step')
    assert.equal(stepLogs[0].status, 'failed')
    assert.equal(stepLogs[0].error_code, 'InputResolutionError')
    assert.isNotNull(stepLogs[0].error_message)
    assert.isNull(stepLogs[0].output_json)
  })

  test('rejects a pipeline without steps before creating any step log', async ({ assert }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [])

    await assert.rejects(() => executeEvent(eventId), /at least one step/)

    const attempt = await db.from('sojalink_attempts').where('event_id', eventId).first()
    assert.equal(attempt.status, 'failed')
    assert.equal(attempt.error_code, 'PipelineValidationError')

    const stepLogs = await db.from('sojalink_step_logs').where('attempt_id', attempt.id)
    assert.lengthOf(stepLogs, 0)
  })

  test('rejects a pipeline referencing an unknown handler at validation time', async ({
    assert,
  }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [
      { key: 'first_step', handler: 'unknown_handler' },
      { key: 'second_step', handler: 'email_notification' },
    ])

    await assert.rejects(() => executeEvent(eventId), /unknown handler "unknown_handler"/)

    const attempt = await db.from('sojalink_attempts').where('event_id', eventId).first()
    assert.equal(attempt.status, 'failed')
    assert.equal(attempt.error_code, 'PipelineValidationError')

    const stepLogs = await db.from('sojalink_step_logs').where('attempt_id', attempt.id)
    assert.lengthOf(stepLogs, 0)
  })

  test('rejects a pipeline with duplicate step keys', async ({ assert }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [
      { key: 'notify_team', handler: 'email_notification' },
      { key: 'notify_team', handler: 'email_notification' },
    ])

    await assert.rejects(() => executeEvent(eventId), /Duplicate step key/)
  })

  test('rejects a pipeline referencing a future step', async ({ assert }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [
      {
        key: 'first_step',
        handler: 'email_notification',
        input: { value: '{{ steps.second_step.sent }}' },
      },
      { key: 'second_step', handler: 'email_notification' },
    ])

    await assert.rejects(() => executeEvent(eventId), /not a previous step/)
  })

  test('rejects an event without an applied rule version', async ({ assert }) => {
    const { eventId } = await seedContext()

    await db.from('sojalink_events').where('id', eventId).update({
      status: 'processing',
      applied_rule_version_id: null,
      processing_started_at: new Date(),
    })

    await assert.rejects(() => executeEvent(eventId), /No applied rule version/)
  })
})
