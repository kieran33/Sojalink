import { type Data } from '@generated/data'
import { Link } from '@adonisjs/inertia/react'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { RuleVersion } from '~/lib/rule'

function eventBadgeVariant(status: Data.Event['status']) {
  return status === 'failed' ? 'destructive' : 'secondary'
}

function formatEventDate(dateString: string | null) {
  if (!dateString) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

export function RuleCard({ rule, version }: { rule: Data.Rule; version: RuleVersion | undefined }) {
  return (
    <Link
      route="rules.show"
      routeParams={{ id: rule.id }}
      className="block h-full"
      preserveScroll={true}
    >
      <Card className="h-full shadow-xs transition-shadow hover:shadow-md">
        <CardHeader className="border-b">
          <CardAction>
            <Badge variant={rule.isActive ? 'default' : 'secondary'}>
              {rule.isActive ? 'Actif' : 'Inactif'}
            </Badge>
          </CardAction>
          <CardTitle className="text-base font-semibold text-foreground">{rule.label}</CardTitle>
          {version && (
            <CardDescription className={cn(version.isActive && 'text-primary')}>
              {version.isActive ? 'Version active' : 'Version'} v{version.versionNumber}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <span className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
              Derniers événements
            </span>

            {rule.recentEvents.length === 0 ? (
              <span className="text-muted-foreground">Aucun événement récent</span>
            ) : (
              <Table>
                <TableBody>
                  {rule.recentEvents.map((event) => (
                    <TableRow key={event.id} className="hover:bg-transparent">
                      <TableCell className="w-full max-w-0 truncate">
                        {event.sourceEntityType} #{event.sourceEntityId}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatEventDate(event.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={eventBadgeVariant(event.status)}>{event.statusLabel}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
