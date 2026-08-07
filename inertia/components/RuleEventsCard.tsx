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
import { EventDetailDialog } from '@/components/EventDetailDialog'
import {
  eventBadgeVariant,
  eventTreatedAt,
  formatDate,
  type RuleEvent,
  type RuleShowData,
  type RuleVersion,
} from '@/lib/rule'

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Historique des événements
        </CardTitle>
        <CardDescription>{events.length} au total</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <span className="text-muted-foreground">Aucun événement pour cette version</span>
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
              {events.map((event) => (
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
