import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock } from '@/components/CodeBlock'
import { isPipeline, type RuleVersion } from '@/lib/rule'

export function RulePipelineCard({ version }: { version: RuleVersion | undefined }) {
  const rawPipeline = version?.pipeline as unknown
  const pipeline = isPipeline(rawPipeline) ? rawPipeline : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Pipeline d&apos;exécution
        </CardTitle>
        <CardDescription>
          {pipeline?.steps.length ?? 0} étape{(pipeline?.steps.length ?? 0) > 1 ? 's' : ''},
          exécutées séquentiellement
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pipeline ? (
          <div className="flex flex-wrap items-center gap-2">
            {pipeline.steps.map((step, index) => (
              <div key={step.key} className="flex items-center gap-2">
                <div className="flex gap-1 rounded-md border bg-secondary px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[0.625rem] font-semibold text-background">
                      {index + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{step.key}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {step.handler}
                      </span>
                    </div>
                  </div>
                </div>
                {index < pipeline.steps.length - 1 && (
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <CodeBlock code={JSON.stringify(version?.pipeline ?? null, null, 2)} />
        )}
      </CardContent>
    </Card>
  )
}
