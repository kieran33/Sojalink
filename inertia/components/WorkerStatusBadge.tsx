import { CircleIcon } from 'lucide-react'

type WorkerStatusBadgeProps = {
  isRunning: boolean
  lastRunAtFormatted: string | null
  averageDurationInMs: number | null
}

export function WorkerStatusBadge({
  isRunning,
  lastRunAtFormatted,
  averageDurationInMs,
}: WorkerStatusBadgeProps) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
      <CircleIcon
        className={
          isRunning
            ? 'h-2 w-2 shrink-0 fill-green-500 text-green-500'
            : 'h-2 w-2 shrink-0 fill-red-500 text-red-500'
        }
      />
      <span className="whitespace-nowrap">Worker {isRunning ? 'actif' : 'inactif'}</span>
      {lastRunAtFormatted && (
        <span className="hidden truncate lg:inline">- dernier cycle {lastRunAtFormatted}</span>
      )}
      {averageDurationInMs !== null && (
        <span className="hidden shrink-0 lg:inline">
          - {Math.round(averageDurationInMs)}ms en moyenne
        </span>
      )}
    </div>
  )
}
