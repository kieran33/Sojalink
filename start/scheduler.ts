import PollEventsJob from '../app/jobs/poll_pending_events_job.js'

export function shouldSchedulePolling(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv !== 'test'
}

if (shouldSchedulePolling()) {
  await PollEventsJob.schedule({}).every('10s')
}
