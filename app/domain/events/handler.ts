export interface StepHandler {
  execute(context: HandlerContext): Promise<HandlerOutput>
}

export type HandlerContext = {
  event: HandlerEvent
  input: Record<string, unknown>
  steps: Record<string, HandlerOutput>
}

export type HandlerEvent = {
  id: number
  sourceApp: string
  sourceEntityType: string
  sourceEntityId: number
  payload: Record<string, unknown>
}

export type HandlerOutput = Record<string, unknown>
