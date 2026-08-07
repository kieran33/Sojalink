import { useState } from 'react'
import { type InertiaProps } from '~/types'
import { Badge } from '@/components/ui/badge'
import { RuleConditionsCard } from '@/components/RuleConditionsCard'
import { RulePipelineCard } from '@/components/RulePipelineCard'
import { RuleRawJson } from '@/components/RuleRawJson'
import { RuleEventsCard } from '@/components/RuleEventsCard'
import { RuleStatsCard } from '@/components/RuleStatsCard'
import { RuleVersionList } from '@/components/RuleVersionList'
import { type RuleShowData } from '@/lib/rule'

type PageProps = InertiaProps<{
  rule: RuleShowData
}>

export default function RuleShow({ rule }: PageProps) {
  const [selectedVersionId, setSelectedVersionId] = useState(
    () => (rule.versions.find((version) => version.isActive) ?? rule.versions[0])?.id
  )

  const selectedVersion =
    rule.versions.find((version) => version.id === selectedVersionId) ?? rule.versions[0]
  const events = selectedVersion?.events ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-heading text-2xl font-semibold">{rule.label}</h1>
        <Badge variant="secondary" className="font-mono text-[0.625rem]">
          {rule.code}
        </Badge>
        <Badge variant={rule.isActive ? 'default' : 'secondary'}>
          {rule.isActive ? 'Actif' : 'Inactif'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <RuleConditionsCard version={selectedVersion} />
          <RulePipelineCard version={selectedVersion} />
          <RuleRawJson version={selectedVersion} />
          <RuleEventsCard
            events={events}
            rule={rule}
            version={selectedVersion}
            onSelectVersion={setSelectedVersionId}
          />
        </div>

        <div className="flex flex-col gap-6">
          <RuleStatsCard events={events} />
          <RuleVersionList
            versions={rule.versions}
            selectedVersionId={selectedVersion?.id}
            onSelect={setSelectedVersionId}
          />
        </div>
      </div>
    </div>
  )
}
