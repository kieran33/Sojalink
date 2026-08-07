import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { flattenConditions, formatDate, isPipeline, type RuleVersion } from '@/lib/rule'
import { cn } from '@/lib/utils'

type RuleVersionListProps = {
  versions: RuleVersion[]
  selectedVersionId: number | undefined
  onSelect: (versionId: number) => void
}

export function RuleVersionList({ versions, selectedVersionId, onSelect }: RuleVersionListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Versions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {versions.map((version) => (
          <button
            key={version.id}
            type="button"
            onClick={() => onSelect(version.id)}
            className={cn(
              'flex flex-col gap-1 rounded-md border px-3 py-2 text-left transition-colors',
              version.id === selectedVersionId
                ? 'border-primary bg-primary/5'
                : 'border-transparent hover:bg-muted'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">v{version.versionNumber}</span>
              <Badge variant={version.isActive ? 'default' : 'secondary'}>
                {version.isActive ? 'Active' : 'Remplacée'}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">{formatDate(version.createdAt)}</span>
            <span className="text-xs text-muted-foreground">
              {flattenConditions(version.conditions)?.length ?? 0} conditions ·{' '}
              {isPipeline(version.pipeline) ? version.pipeline.steps.length : 0} étapes
            </span>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
