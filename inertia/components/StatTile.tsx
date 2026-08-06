import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type StatTileProps = {
  label: string
  value: number
  tone?: 'default' | 'destructive'
}

export function StatTile({ label, value, tone = 'default' }: StatTileProps) {
  return (
    <Card className="shadow-xs">
      <CardContent className="flex flex-col gap-1">
        <span className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        <span
          className={cn('text-2xl font-semibold', tone === 'destructive' && 'text-destructive')}
        >
          {value}
        </span>
      </CardContent>
    </Card>
  )
}
