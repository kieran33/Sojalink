export type Pipeline = {
  steps: PipelineStep[]
}

export type PipelineStep = {
  key: string
  handler: string
  input?: Record<string, unknown>
}
