import SojalinkEventType from '#models/sojalink_event_type'
import SojalinkRule from '#models/sojalink_rule'
import SojalinkRuleVersion from '#models/sojalink_rule_version'
import SojalinkEvent from '#models/sojalink_event'

/**
 * Shared helpers for the manual-testing scenario seeders
 * (database/seeders/scenarios/*). Not a seeder itself.
 *
 * Each scenario owns an isolated graph (event type + rule + version) so
 * running one scenario never changes the behavior of another. Re-running
 * a scenario reuses its graph and inserts a fresh pending event.
 */

export type ScenarioGraph = {
  eventTypeCode: string
  ruleCode: string
  conditions: unknown
  pipeline: unknown
}

export async function ensureScenarioGraph(graph: ScenarioGraph) {
  const eventType = await SojalinkEventType.updateOrCreate(
    { code: graph.eventTypeCode },
    { code: graph.eventTypeCode, label: `Scenario: ${graph.eventTypeCode}`, isActive: true }
  )

  const rule = await SojalinkRule.updateOrCreate(
    { code: graph.ruleCode },
    {
      code: graph.ruleCode,
      label: `Scenario: ${graph.ruleCode}`,
      eventTypeId: eventType.id,
      priority: 5,
      isActive: true,
    }
  )

  const ruleVersion = await SojalinkRuleVersion.updateOrCreate(
    { ruleId: rule.id, versionNumber: 1 },
    {
      ruleId: rule.id,
      versionNumber: 1,
      isActive: true,
      conditionsJson: JSON.stringify(graph.conditions),
      pipelineJson: JSON.stringify(graph.pipeline),
    }
  )

  return { eventType, rule, ruleVersion }
}

export async function insertPendingEvent(params: {
  eventTypeId: number
  sourceApp: string
  payload: Record<string, unknown>
}) {
  return SojalinkEvent.create({
    eventTypeId: params.eventTypeId,
    sourceApp: params.sourceApp,
    sourceEntityType: 'scenario',
    sourceEntityId: Math.floor(Math.random() * 1_000_000),
    status: 'pending',
    payloadJson: JSON.stringify(params.payload),
  })
}

export function printExpectation(eventId: number, lines: string[]) {
  console.log('')
  console.log(`Pending event #${eventId} inserted — the worker should pick it up within ~10s.`)
  console.log('Expected outcome:')
  lines.forEach((line) => console.log(`  - ${line}`))
  console.log('Check with:')
  console.log(
    `  SELECT e.status, e.resolution_error_code, a.status AS attempt_status, a.error_code,\n` +
      `         s.step_index, s.step_code, s.status AS step_status, s.input_json, s.output_json\n` +
      `  FROM sojalink_events e\n` +
      `  LEFT JOIN sojalink_attempts a ON a.event_id = e.id\n` +
      `  LEFT JOIN sojalink_step_logs s ON s.attempt_id = a.id\n` +
      `  WHERE e.id = ${eventId} ORDER BY s.step_index;`
  )
  console.log('')
}
