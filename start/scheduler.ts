import PollPendingEventsJob from '#jobs/poll_pending_events_job'

export function shouldSchedulePolling(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv !== 'test'
}

if (shouldSchedulePolling()) {
  await PollPendingEventsJob.schedule({}).every('10s')
}
