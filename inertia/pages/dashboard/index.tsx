import { useState } from 'react'
import { LayoutGridIcon, TableIcon } from 'lucide-react'
import { type InertiaProps } from '~/types'
import { type Data } from '@generated/data'
import { StatTile } from '@/components/StatTile'
import { RuleCard } from '@/components/RuleCard'
import { RulesTable } from '@/components/RulesTable'
import { PaginationBar } from '~/components/PaginationBar'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type ViewMode = 'cards' | 'table'

const VIEW_MODE_STORAGE_KEY = 'dashboard-view-mode'

function getInitialViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'cards'
  return localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'table' ? 'table' : 'cards'
}

type DashboardStats = {
  totalRules: number
  activeRules: number
  processedLast24h: number
  failedLast24h: number
}

type DashboardPaginationMeta = {
  page: number
  perPage: number
  total: number
  lastPage: number
}

type PageProps = InertiaProps<{
  rules: Data.Rule[]
  stats: DashboardStats
  pagination: DashboardPaginationMeta
}>

export default function DashboardIndex({ rules, stats, pagination }: PageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode)

  function selectViewMode(mode: ViewMode) {
    setViewMode(mode)
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold">Automatisations</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Règles totales" value={stats.totalRules} />
        <StatTile label="Règles actives" value={stats.activeRules} />
        <StatTile label="Traités (24h)" value={stats.processedLast24h} />
        <StatTile label="En échec (24h)" value={stats.failedLast24h} tone="destructive" />
      </div>

      <div className="flex items-center justify-between">
        <ToggleGroup
          variant="outline"
          spacing={0}
          value={[viewMode]}
          onValueChange={(value) => {
            const mode = value[0] as ViewMode | undefined
            if (mode) selectViewMode(mode)
          }}
        >
          <ToggleGroupItem value="cards" aria-label="Affichage en cartes">
            <LayoutGridIcon data-icon="inline-start" /> Grille
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Affichage en tableau">
            <TableIcon data-icon="inline-start" /> Tableau
          </ToggleGroupItem>
        </ToggleGroup>
        <PaginationBar baseUrl="/dashboard" page={pagination.page} lastPage={pagination.lastPage} />
      </div>

      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} />
          ))}
        </div>
      ) : (
        <RulesTable rules={rules} />
      )}
    </div>
  )
}
