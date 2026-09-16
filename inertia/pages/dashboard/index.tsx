import { useState } from 'react'
import { LayoutGridIcon, TableIcon } from 'lucide-react'
import { router, usePage } from '@inertiajs/react'
import { type InertiaProps } from '~/types'
import { type Data } from '@generated/data'
import { StatTile } from '@/components/StatTile'
import { RuleCard } from '@/components/RuleCard'
import { RulesTable } from '@/components/RulesTable'
import { PaginationBar } from '~/components/PaginationBar'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Button } from '@/components/ui/button'

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
  unattributedEvents: Data.Event[]
}>

function SeedDemoButton() {
  const { flash } = usePage<Data.SharedProps>().props
  const [loading, setLoading] = useState(false)

  function handleClick() {
    setLoading(true)
    router.post(
      '/dashboard/seed-demo',
      {},
      {
        preserveScroll: true,
        onSuccess: () => {
          // Le worker traite les events en quelques secondes : on rafraîchit
          // le dashboard 2-3 fois après coup pour voir les résultats apparaître.
          setTimeout(() => router.reload({ only: ['rules', 'stats', 'unattributedEvents'] }), 3000)
          setTimeout(() => router.reload({ only: ['rules', 'stats', 'unattributedEvents'] }), 8000)
        },
        onFinish: () => setLoading(false),
      }
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {flash.success && <p className="text-sm text-success">{flash.success}</p>}
      {flash.error && <p className="text-sm text-destructive">{flash.error}</p>}
      <Button onClick={handleClick} disabled={loading} className="w-fit">
        {loading ? 'Ajout en cours...' : 'Ajouter événements'}
      </Button>
    </div>
  )
}

export default function DashboardIndex({
  rules,
  stats,
  pagination,
  unattributedEvents,
}: PageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode)

  function selectViewMode(mode: ViewMode) {
    setViewMode(mode)
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold">Automatisations</h1>

      <SeedDemoButton />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Règles totales" value={stats.totalRules} />
        <StatTile label="Règles actives" value={stats.activeRules} />
        <StatTile label="Événements réussis (24h)" value={stats.processedLast24h} tone="success" />
        <StatTile label="Événements échoués (24h)" value={stats.failedLast24h} tone="destructive" />
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
            <RuleCard
              key={rule.id}
              rule={rule}
              version={rule.displayedVersion}
              unattributedEvents={unattributedEvents}
            />
          ))}
        </div>
      ) : (
        <RulesTable rules={rules} />
      )}
    </div>
  )
}