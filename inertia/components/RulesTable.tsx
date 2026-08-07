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
  return status === 'failed' ? 'destructive' : 'secondary'
}

export function RulesTable({ rules }: { rules: Data.Rule[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Règle</TableHead>
          <TableHead>Type d'événement</TableHead>
          <TableHead>Priorité</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Derniers événements</TableHead>
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
                <span className="text-muted-foreground">{rule.code}</span>
              </Link>
            </TableCell>
            <TableCell>{rule.eventType.label}</TableCell>
            <TableCell>{rule.priority}</TableCell>
            <TableCell>
              <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                {rule.isActive ? 'Actif' : 'Inactif'}
              </Badge>
            </TableCell>
            <TableCell>
              {rule.displayedVersion ? `v${rule.displayedVersion.versionNumber}` : '—'}
            </TableCell>
            <TableCell>
              {rule.recentEvents.length === 0 ? (
                <span className="text-muted-foreground">Aucun événement récent</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {rule.recentEvents.map((event) => (
                    <Badge key={event.id} variant={eventBadgeVariant(event.status)}>
                      {event.statusLabel}
                    </Badge>
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
