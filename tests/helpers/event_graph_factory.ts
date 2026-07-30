import db from '@adonisjs/lucid/services/db'
import SojalinkEventTypeSeeder from '#database/seeders/sojalink_event_type_seeder'
import SojalinkRuleSeeder from '#database/seeders/sojalink_rule_seeder'
import SojalinkRuleVersionSeeder from '#database/seeders/sojalink_rule_version_seeder'
import SojalinkEventSeeder from '#database/seeders/sojalink_event_seeder'

export type EventGraph = {
  eventTypeId: number
  ruleId: number
  ruleVersionId: number
}

/**
 * Seeds one event type, its active rule and the rule's active version —
 * the minimal graph every resolver/executor integration test needs
 * before it can act on an event. Shared here so each spec stops
 * re-declaring its own near-identical seeding helper.
 */
export async function seedEventGraph(): Promise<EventGraph> {
  const client = db.connection()

  await new SojalinkEventTypeSeeder(client).run()
  await new SojalinkRuleSeeder(client).run()
  await new SojalinkRuleVersionSeeder(client).run()

  const eventType = await db
    .from('sojalink_event_types')
    .where('code', 'sojadispro.order.created')
    .first()

  const rule = await db
    .from('sojalink_rules')
    .where('code', 'sojadispro-order-to-toki-task')
    .first()

  const ruleVersion = rule
    ? await db.from('sojalink_rule_versions').where('rule_id', rule.id).first()
    : null

  if (!eventType || !rule || !ruleVersion) {
    throw new Error('Expected event type, rule and rule version to exist')
  }

  return { eventTypeId: eventType.id, ruleId: rule.id, ruleVersionId: ruleVersion.id }
}

/**
 * seedEventGraph() plus the pending event shipped by SojalinkEventSeeder,
 * for tests that need a processable event rather than just the graph
 * it will be matched against.
 */
export async function seedEventGraphWithPendingEvent(): Promise<EventGraph & { eventId: number }> {
  const graph = await seedEventGraph()

  await new SojalinkEventSeeder(db.connection()).run()

  const event = await db.from('sojalink_events').where('status', 'pending').first()

  if (!event) {
    throw new Error('Expected a pending event to exist')
  }

  return { ...graph, eventId: event.id }
}
