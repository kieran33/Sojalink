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
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <CircleIcon
        className={
          isRunning ? 'h-2 w-2 fill-green-500 text-green-500' : 'h-2 w-2 fill-red-500 text-red-500'
        }
      />
      Worker {isRunning ? 'actif' : 'inactif'}
      {lastRunAtFormatted && <span>· dernier cycle {lastRunAtFormatted}</span>}
      {averageDurationInMs !== null && (
        <span>- {Math.round(averageDurationInMs)}ms en moyenne</span>
      )}
    </div>
  )
}
