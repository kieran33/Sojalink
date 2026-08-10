import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { EventDetailDialog } from '@/components/EventDetailDialog'
import {
  eventBadgeVariant,
  eventTreatedAt,
  formatDate,
  type RuleEvent,
  type RuleShowData,
  type RuleVersion,
} from '@/lib/rule'

const STATUS_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'pending', label: 'En attente' },
  { value: 'processing', label: 'En cours' },
  { value: 'processed', label: 'Traité' },
  { value: 'failed', label: 'Échec' },
] as const

type StatusFilter = (typeof STATUS_FILTERS)[number]['value']

export function RuleEventsCard({
  events,
  rule,
  version,
  onSelectVersion,
}: {
  events: RuleEvent[]
  rule: RuleShowData
  version: RuleVersion | undefined
  onSelectVersion: (versionId: number) => void
}) {
  const [selectedEvent, setSelectedEvent] = useState<RuleEvent | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filteredEvents =
    statusFilter === 'all' ? events : events.filter((event) => event.status === statusFilter)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Historique des événements
        </CardTitle>
        <CardDescription>
          {filteredEvents.length} affiché{filteredEvents.length > 1 ? 's' : ''} sur {events.length}{' '}
          au total
        </CardDescription>
        {events.length > 0 && (
          <ToggleGroup
            value={[statusFilter]}
            onValueChange={(value) => {
              if (value[0]) setStatusFilter(value[0] as StatusFilter)
            }}
            className="justify-start"
          >
            {STATUS_FILTERS.map((filter) => (
              <ToggleGroupItem key={filter.value} value={filter.value} size="sm">
                {filter.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <span className="text-muted-foreground">Aucun événement pour cette version</span>
        ) : filteredEvents.length === 0 ? (
          <span className="text-muted-foreground">Aucun événement avec ce statut</span>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead>Traité le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => (
                <TableRow
                  key={event.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedEvent(event)}
                  onKeyDown={(keyboardEvent) => {
                    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                      keyboardEvent.preventDefault()
                      setSelectedEvent(event)
                    }
                  }}
                  className="cursor-pointer"
                >
                  <TableCell className="font-mono">#{event.id}</TableCell>
                  <TableCell className="font-medium">
                    {event.sourceApp} · {event.sourceEntityType}
                  </TableCell>
                  <TableCell>
                    <Badge variant={eventBadgeVariant(event.status)}>{event.statusLabel}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(event.createdAt)}</TableCell>
                  <TableCell>{formatDate(eventTreatedAt(event))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <EventDetailDialog
        event={selectedEvent}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null)
        }}
        rule={rule}
        version={version}
        onNavigateToVersion={(versionId) => {
          setSelectedEvent(null)
          onSelectVersion(versionId)
        }}
      />
    </Card>
  )
}
