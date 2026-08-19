import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock } from '@/components/CodeBlock'
import { flattenConditions, type RuleVersion } from '@/lib/rule'

export function RuleConditionsCard({ version }: { version: RuleVersion | undefined }) {
  const leaves = version ? flattenConditions(version.conditions) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Conditions de déclenchement
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {leaves ? (
          <>
            <p className="text-sm text-muted-foreground">
              {leaves.length > 1 ? 'Doivent toutes être vraies :' : 'Doit être vraie :'}
            </p>
            <div className="flex flex-col gap-2">
              {leaves.map((leaf, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-md border bg-secondary px-4 py-3 font-mono text-sm"
                >
                  <span className="font-medium">{leaf.field}</span>
                  <span className="text-muted-foreground">=</span>
                  <span className="text-sky-600 dark:text-sky-400">
                    {JSON.stringify(leaf.value)}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <CodeBlock code={JSON.stringify(version?.conditions ?? null, null, 2)} />
        )}
      </CardContent>
    </Card>
  )
}
