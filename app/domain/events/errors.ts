/**
 * Typed engine errors. The error `name` is persisted as `error_code`
 * in `sojalink_attempts` / `sojalink_step_logs` and as
 * `resolution_error_code` on the event, so keep names stable.
 */

export class RuleResolutionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RuleResolutionError'
  }
}

export class NoMatchingRuleError extends RuleResolutionError {
  constructor(message: string) {
    super(message)
    this.name = 'NoMatchingRuleError'
  }
}

export class MultipleMatchingRulesError extends RuleResolutionError {
  constructor(message: string) {
    super(message)
    this.name = 'MultipleMatchingRulesError'
  }
}

export class PipelineValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PipelineValidationError'
  }
}

export class InputResolutionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InputResolutionError'
  }
}

export class HandlerNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HandlerNotFoundError'
  }
}

export class EventExecutionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EventExecutionError'
  }
}

export class InvalidJsonError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidJsonError'
  }
}
