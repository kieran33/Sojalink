import { useEffect, useState, type ReactNode } from 'react'
import { CheckIcon, XIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { CodeBlock } from '@/components/CodeBlock'
import {
  attemptBadgeVariant,
  attemptStatusLabel,
  eventBadgeVariant,
  formatDate,
  formatDuration,
  type RuleEvent,
  type RuleShowData,
  type RuleStepLog,
  type RuleVersion,
} from '@/lib/rule'
import { cn } from '@/lib/utils'

type EventDetailDialogProps = {
  event: RuleEvent | null
  onOpenChange: (open: boolean) => void
  rule: RuleShowData
  version: RuleVersion | undefined
  onNavigateToVersion: (versionId: number) => void
}

export function EventDetailDialog({
  event,
  onOpenChange,
  rule,
  version,
  onNavigateToVersion,
}: EventDetailDialogProps) {
  const [displayedEvent, setDisplayedEvent] = useState<RuleEvent | null>(event)

  useEffect(() => {
    if (event) setDisplayedEvent(event)
  }, [event])

  const attempts = displayedEvent?.attempts ?? []

  return (
    <Dialog open={event !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {displayedEvent && (
          <>
            <DialogHeader className="gap-1.5 border-b px-4 py-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-2 pr-6">
                <DialogTitle>
                  #{displayedEvent.id}{' '}
                  {displayedEvent.eventType?.label ?? displayedEvent.sourceEntityType}
                </DialogTitle>
                <Badge variant={eventBadgeVariant(displayedEvent.status)}>
                  {displayedEvent.statusLabel}
                </Badge>
              </div>
              <DialogDescription>
                {displayedEvent.sourceApp} · {displayedEvent.sourceEntityType} #
                {displayedEvent.sourceEntityId}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-6 overflow-y-auto px-4 py-5 sm:px-6">
              <EventTimeline event={displayedEvent} />

              <section className="flex flex-col gap-3">
                <SectionTitle>Payload</SectionTitle>
                <CodeBlock code={JSON.stringify(displayedEvent.payload, null, 2)} />
              </section>

              {version && (
                <ResolutionCard
                  rule={rule}
                  version={version}
                  onNavigate={() => {
                    onNavigateToVersion(version.id)
                    onOpenChange(false)
                  }}
                />
              )}

              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <SectionTitle>Exécutions</SectionTitle>
                  <span className="text-xs text-muted-foreground">
                    {attempts.length} tentative{attempts.length > 1 ? 's' : ''}
                  </span>
                </div>

                {attempts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune tentative pour le moment</p>
                ) : (
                  <Accordion multiple defaultValue={[String(attempts[attempts.length - 1].id)]}>
                    {attempts.map((attempt) => (
                      <AccordionItem key={attempt.id} value={String(attempt.id)}>
                        <AccordionTrigger>
                          <span className="flex w-full flex-wrap items-center justify-between gap-2 pr-2">
                            <span className="flex items-center gap-2">
                              <Badge className={attemptBadgeVariant(attempt.status)}>
                                {attemptStatusLabel(attempt.status)}
                              </Badge>
                              <span className="font-medium">Tentative {attempt.attemptNumber}</span>
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {formatDate(attempt.startedAt)}
                              {attempt.finishedAt &&
                                ` · ${formatDuration(attempt.startedAt, attempt.finishedAt)}`}
                            </span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="flex flex-col gap-4">
                            {attempt.errorMessage && (
                              <p className="text-xs text-destructive">
                                {attempt.errorCode ? `${attempt.errorCode} — ` : ''}
                                {attempt.errorMessage}
                              </p>
                            )}
                            {(attempt.stepLogs ?? []).length === 0 ? (
                              <p className="text-xs text-muted-foreground">Aucune étape exécutée</p>
                            ) : (
                              (attempt.stepLogs ?? []).map((step) => (
                                <StepLogRow key={step.id} step={step} />
                              ))
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </section>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </h3>
  )
}

function EventTimeline({ event }: { event: RuleEvent }) {
  const failed = event.status === 'failed'

  const steps = [
    { label: 'Créé', at: event.createdAt as string | null, done: true, failed: false },
    {
      label: 'En traitement',
      at: event.processingStartedAt,
      done: Boolean(event.processingStartedAt),
      failed: false,
    },
    { label: 'Résolu', at: event.resolvedAt, done: Boolean(event.resolvedAt), failed: false },
    {
      label: failed ? 'Échec' : 'Traité',
      at: event.processedAt ?? event.failedAt,
      done: Boolean(event.processedAt ?? event.failedAt),
      failed,
    },
  ]

  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>Chronologie</SectionTitle>
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-0">
          {steps.map((step, index) => (
            <div key={step.label} className="relative flex min-w-27.5 flex-1 flex-col items-center">
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute top-1 left-1/2 h-px w-full',
                    step.done ? (step.failed ? 'bg-destructive/40' : 'bg-primary/40') : 'bg-border'
                  )}
                />
              )}
              <span
                className={cn(
                  'z-10 size-2 rounded-full',
                  step.done ? (step.failed ? 'bg-destructive' : 'bg-primary') : 'bg-border'
                )}
              />
              <span className="mt-2 text-center text-[0.6875rem] text-muted-foreground">
                {step.label}
              </span>
              <span className="text-center font-mono text-[0.6875rem]">{formatDate(step.at)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ResolutionCard({
  rule,
  version,
  onNavigate,
}: {
  rule: RuleShowData
  version: RuleVersion
  onNavigate: () => void
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>Règle appliquée</SectionTitle>
      <button
        type="button"
        onClick={onNavigate}
        className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-left transition-colors hover:bg-muted"
      >
        <span className="text-sm font-medium">{rule.label}</span>
        <Badge variant="secondary" className="font-mono">
          v{version.versionNumber} · {version.isActive ? 'active' : 'inactive'}
        </Badge>
      </button>
    </section>
  )
}

function StepLogRow({ step }: { step: RuleStepLog }) {
  const [showIO, setShowIO] = useState(false)
  const failed = step.status === 'failed'

  return (
    <div className="flex gap-2.5">
      <span
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
          failed
            ? 'bg-destructive/10 text-destructive'
            : 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
        )}
      >
        {failed ? <XIcon className="size-3" /> : <CheckIcon className="size-3" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium">{step.stepCode}</span>
          <span className="font-mono text-[0.6875rem] text-muted-foreground">
            {step.handlerName}
          </span>
        </div>
        {step.errorMessage && (
          <p className="text-xs text-destructive">
            {step.errorCode ? `${step.errorCode} — ` : ''}
            {step.errorMessage}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setShowIO((value) => !value)}
        >
          {showIO ? 'Masquer entrée/sortie' : 'Afficher entrée/sortie'}
        </Button>
        {showIO && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
                Entrée
              </span>
              <CodeBlock code={JSON.stringify(step.input, null, 2)} />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
                Sortie
              </span>
              <CodeBlock code={JSON.stringify(step.output, null, 2)} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
