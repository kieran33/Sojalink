/**
 * Contract shared by every step handler.
 *
 * A handler executes exactly one business action:
 * - it receives an already-resolved input (never raw `{{ }}` templates)
 * - it returns a small JSON-serializable output
 * - it throws on failure
 *
 * A handler never drives the pipeline flow, never updates event/attempt
 * statuses and never writes into the SojaLink internal tables.
 * Technical services (mailer, external APIs...) are provided through
 * constructor dependency injection, not through the context.
 */
export interface StepHandler {
  execute(context: HandlerContext): Promise<HandlerOutput>
}

export type HandlerContext = {
  /** Read-only data of the event being processed. */
  event: HandlerEvent
  /** Input of the step, resolved by the engine. */
  input: Record<string, unknown>
  /** Outputs of the previously executed steps, keyed by step key. */
  steps: Record<string, HandlerOutput>
}

export type HandlerEvent = {
  id: number
  sourceApp: string
  sourceEntityType: string
  sourceEntityId: number
  payload: Record<string, unknown>
}

/** Handler outputs must stay small, flat and JSON-serializable. */
export type HandlerOutput = Record<string, unknown>
