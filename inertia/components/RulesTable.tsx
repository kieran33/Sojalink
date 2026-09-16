import { type Data } from '@generated/data'
import { Link } from '@adonisjs/inertia/react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

function eventBadgeVariant(status: Data.Event['status']) {
  if (status === 'failed') return 'destructive'
  if (status === 'processed') return 'success'
  return 'secondary'
}

function eventDisplayDate(event: Data.Event) {
  return event.status === 'failed' ? event.failedAt : event.processedAt
}

function formatEventDate(dateString: string | null) {
  if (!dateString) return '-'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(dateString))
}

export function RulesTable({ rules }: { rules: Data.Rule[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Règle</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Priorité</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Derniers événements traités par le worker</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((rule) => (
          <TableRow key={rule.id}>
            <TableCell>
              <Link
                route="rules.show"
                routeParams={{ id: rule.id }}
                className="flex flex-col gap-0.5 whitespace-normal"
              >
                <span className="font-medium text-foreground">{rule.label}</span>
              </Link>
            </TableCell>
            <TableCell>
              {rule.displayedVersion ? `v${rule.displayedVersion.versionNumber}` : '-'}
            </TableCell>
            <TableCell>{rule.priority}</TableCell>
            <TableCell>
              <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                {rule.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell>
              {rule.recentEvents.length === 0 ? (
                <span className="text-muted-foreground">Aucun événement récent</span>
              ) : (
                <div className="flex flex-col gap-1">
                  {rule.recentEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-2 text-xs">
                      <span className="text-foreground">Événement #{event.id}</span>
                      <span className="whitespace-nowrap text-muted-foreground">
                        {formatEventDate(eventDisplayDate(event))}
                      </span>
                      <Badge variant={eventBadgeVariant(event.status)}>{event.statusLabel}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
