import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import SojalinkEventTypeSeeder from '#database/seeders/sojalink_event_type_seeder'
import SojalinkRuleSeeder from '#database/seeders/sojalink_rule_seeder'
import SojalinkRuleVersionSeeder from '#database/seeders/sojalink_rule_version_seeder'
import SojalinkEventSeeder from '#database/seeders/sojalink_event_seeder'
import { ExecuteEvent } from '#application/events/execute_event'
import { RuleRepository } from '#persistence/events/rule_repository'
import { AttemptRepository } from '#persistence/events/attempt_repository'
import { EventRepository } from '#persistence/events/event_repository'
import { ValidatePipeline } from '#application/events/validate_pipeline'
import { RuleVersionRepository } from '#persistence/events/rule_version_repository'
import logger from '@adonisjs/core/services/logger'

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

async function setPipeline(ruleVersionId: number, steps: any[]) {
  await db
    .from('sojalink_rule_versions')
    .where('id', ruleVersionId)
    .update({
      pipeline_json: JSON.stringify({ steps }),
    })
}

function createExecutor() {
  return new ExecuteEvent(
    new RuleRepository(),
    new AttemptRepository(),
    new EventRepository(),
    new ValidatePipeline(new RuleVersionRepository())
  )
}

test.group('ExecuteEvent', (group) => {
  group.each.setup(async () => {
    await db.from('sojalink_step_logs').delete()
    await db.from('sojalink_attempts').delete()
    await db.from('sojalink_entity_correlations').delete()
    await db.from('sojalink_events').delete()
    await db.from('sojalink_rule_versions').delete()
    await db.from('sojalink_rules').delete()
    await db.from('sojalink_event_types').delete()
  })

  test('Check if pipeline with one step is succeed', async ({ assert }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [{ key: 'step-1', handler: 'create_toki_task' }])

    await createExecutor().execute(eventId)

    const event = await db.from('sojalink_events').where('id', eventId).first()
    logger.info({ event }, 'Event')
    assert.equal(event.status, 'processed')

    const attempt = await db.from('sojalink_attempts').where('event_id', eventId).first()
    logger.info({ attempt }, 'Attempt')
    assert.equal(attempt.status, 'success')

    const stepLogs = await db.from('sojalink_step_logs').where('attempt_id', attempt.id)
    logger.info({ stepLogs }, 'Step logs')
    assert.lengthOf(stepLogs, 1)
    assert.equal(stepLogs[0].step_code, 'step-1')
    assert.equal(stepLogs[0].handler_key, 'create_toki_task')
    assert.equal(stepLogs[0].status, 'success')
    assert.isNotNull(stepLogs[0].input_json)
    assert.isNotNull(stepLogs[0].output_json)
  })

  test('Check if pipeline has multiple steps', async ({ assert }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [
      { key: 'step-1', handler: 'create_toki_task' },
      { key: 'step-2', handler: 'create_toki_task' },
      { key: 'step-3', handler: 'create_toki_task' },
    ])

    await createExecutor().execute(eventId)

    const attempt = await db.from('sojalink_attempts').where('event_id', eventId).first()
    logger.info({ attempt }, 'Attempt')
    assert.equal(attempt.status, 'success')
    assert.equal(attempt.attempt_number, 1)
  })

  test('Check if output step 1 is accessible from step 2', async ({ assert }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [
      { key: 'step-1', handler: 'create_toki_task' },
      { key: 'step-2', handler: 'create_toki_task' },
    ])

    await createExecutor().execute(eventId)

    const attempt = await db.from('sojalink_attempts').where('event_id', eventId).first()
    logger.info({ attempt }, 'Attempt')
    assert.equal(attempt.status, 'success')
  })

  test('Create attempt when starting', async ({ assert }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [{ key: 'step-1', handler: 'create_toki_task' }])

    await createExecutor().execute(eventId)

    const attempts = await db.from('sojalink_attempts').where('event_id', eventId)
    logger.info({ attempts }, 'Attempts')
    assert.lengthOf(attempts, 1)
    assert.isNotNull(attempts[0].started_at)
  })

  test('Only one attempt is active', async ({ assert }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [{ key: 'step-1', handler: 'create_toki_task' }])

    await db.table('sojalink_attempts').insert({
      event_id: eventId,
      attempt_number: 1,
      status: 'active',
      started_at: new Date(),
    })

    await assert.rejects(() => createExecutor().execute(eventId), /already active/)
  })

  test('Check if attempt is succeed', async ({ assert }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [{ key: 'step-1', handler: 'create_toki_task' }])

    await createExecutor().execute(eventId)

    const attempt = await db.from('sojalink_attempts').where('event_id', eventId).first()
    logger.info({ attempt }, 'Attempt')
    assert.equal(attempt.status, 'success')
    assert.isNotNull(attempt.finished_at)
  })

  test('Check if event is succeed', async ({ assert }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [{ key: 'step-1', handler: 'create_toki_task' }])

    await createExecutor().execute(eventId)

    const event = await db.from('sojalink_events').where('id', eventId).first()
    logger.info({ event }, 'Event')
    assert.equal(event.status, 'processed')
  })

  test('Stop if error in step', async ({ assert }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [
      { key: 'step-1', handler: 'unknown_handler' },
      { key: 'step-2', handler: 'create_toki_task' },
    ])

    await assert.rejects(() => createExecutor().execute(eventId))

    const event = await db.from('sojalink_events').where('id', eventId).first()
    logger.info({ event }, 'Event')
    assert.equal(event.status, 'failed')
  })

  test('Next step not executed if previous step failed', async ({ assert }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [
      { key: 'step-1', handler: 'unknown_handler' },
      { key: 'step-2', handler: 'create_toki_task' },
    ])

    await assert.rejects(() => createExecutor().execute(eventId))

    const attempt = await db.from('sojalink_attempts').where('event_id', eventId).first()
    logger.info({ attempt }, 'Attempt')
    assert.equal(attempt.status, 'failed')
  })

  test('Check if attempt is failed', async ({ assert }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [{ key: 'step-1', handler: 'unknown_handler' }])

    await assert.rejects(() => createExecutor().execute(eventId))

    const attempt = await db.from('sojalink_attempts').where('event_id', eventId).first()
    logger.info({ attempt }, 'Attempt')
    assert.equal(attempt.status, 'failed')
    assert.isNotNull(attempt.finished_at)
  })

  test('Check if event is failed', async ({ assert }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await setPipeline(ruleVersionId, [{ key: 'step-1', handler: 'unknown_handler' }])

    await assert.rejects(() => createExecutor().execute(eventId))

    const event = await db.from('sojalink_events').where('id', eventId).first()
    logger.info({ event }, 'Event')
    assert.equal(event.status, 'failed')
  })

  test('Invalide pipeline get failed before execution', async ({ assert }) => {
    const { eventId, ruleVersionId } = await seedContext()
    await setEventProcessing(eventId, ruleVersionId)
    await db
      .from('sojalink_rule_versions')
      .where('id', ruleVersionId)
      .update({
        pipeline_json: JSON.stringify({ steps: [] }),
      })

    await assert.rejects(() => createExecutor().execute(eventId), /No steps/)
  })
})
