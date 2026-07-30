import { InertiaProps } from '~/types'
import { Data } from '@generated/data'

type DashboardStats = {
  totalRules: number
  activeRules: number
  processedLast24h: number
  failedLast24h: number
}

type PageProps = InertiaProps<{
  rules: Data.Rule[]
  stats: DashboardStats
}>

export default function DashboardIndex({ rules, stats }: PageProps) {
  return (
    <div>
      <h1>Dashboard</h1>
      <pre>{JSON.stringify({ rules, stats }, null, 2)}</pre>
    </div>
  )
}
