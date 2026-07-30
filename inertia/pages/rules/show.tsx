import { InertiaProps } from '~/types'
import { Data } from '@generated/data'

type PageProps = InertiaProps<{
  rule: Data.Rule.Variants['forShowPage']
}>

export default function RuleShow({ rule }: PageProps) {
  return (
    <div>
      <h1>Règle</h1>
      <pre>{JSON.stringify(rule, null, 2)}</pre>
    </div>
  )
}
