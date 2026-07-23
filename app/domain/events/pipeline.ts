/**
 * A validated pipeline, as stored in `sojalink_rule_versions.pipeline_json`.
 * Steps run sequentially, in array order, and stop at the first failure.
 */
export type Pipeline = {
  steps: PipelineStep[]
}

export type PipelineStep = {
  /** Unique key of the step inside the pipeline (snake_case recommended). */
  key: string
  /** Name of a handler registered in the HandlerRegistry. */
  handler: string
  /**
   * Input template passed to the handler after variable resolution.
   * String values may reference `{{ event.xxx }}` or `{{ steps.<key>.xxx }}`.
   */
  input?: Record<string, unknown>
}
