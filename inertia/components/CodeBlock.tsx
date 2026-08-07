import { cn } from '@/lib/utils'

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const TOKEN_PATTERN =
  /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

function highlightJson(json: string) {
  return escapeHtml(json).replace(TOKEN_PATTERN, (match) => {
    let className = 'text-amber-600 dark:text-amber-400'
    if (match.startsWith('"')) {
      className = match.endsWith(':')
        ? 'text-sky-600 dark:text-sky-400'
        : 'text-emerald-600 dark:text-emerald-400'
    } else if (match === 'true' || match === 'false') {
      className = 'text-purple-600 dark:text-purple-400'
    } else if (match === 'null') {
      className = 'text-muted-foreground'
    }
    return `<span class="${className}">${match}</span>`
  })
}

export function CodeBlock({ code, className }: { code: string; className?: string }) {
  return (
    <pre
      className={cn(
        'overflow-x-auto rounded-md border bg-muted/40 p-2 font-mono text-xs leading-relaxed',
        className
      )}
      dangerouslySetInnerHTML={{ __html: `<code>${highlightJson(code)}</code>` }}
    />
  )
}
