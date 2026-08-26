import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { computeEventStats, type RuleEvent } from '@/lib/rule'

export function RuleStatsCard({ events }: { events: RuleEvent[] }) {
  const stats = computeEventStats(events)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Indicateurs
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Taux de réussite</p>
          <p className="text-2xl font-semibold">
            {stats.successRate === null ? '-' : `${stats.successRate}%`}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Événements réussis</p>
          <p className="text-2xl font-semibold text-success">{stats.processed}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Événements échoués</p>
          <p className="text-2xl font-semibold text-destructive">{stats.failed}</p>
        </div>
      </CardContent>
    </Card>
  )
}
