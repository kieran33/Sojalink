import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CodeBlock } from '@/components/CodeBlock'
import { type RuleVersion } from '@/lib/rule'

export function RuleRawJson({ version }: { version: RuleVersion | undefined }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="outline" size="sm" onClick={() => setVisible((value) => !value)}>
          {visible ? 'Masquer le JSON brut' : 'Afficher le JSON brut'}
        </Button>
      </div>

      {visible && version && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
              Conditions JSON
            </span>
            <CodeBlock code={JSON.stringify(version.conditions, null, 2)} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
              Pipeline JSON
            </span>
            <CodeBlock code={JSON.stringify(version.pipeline, null, 2)} />
          </div>
        </div>
      )}
    </div>
  )
}
