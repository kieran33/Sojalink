import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import SojalinkEventType from '#models/sojalink_event_type'
import SojalinkRule from '#models/sojalink_rule'
import SojalinkRuleVersion from '#models/sojalink_rule_version'
import SojalinkEvent from '#models/sojalink_event'
import SojalinkAttempt from '#models/sojalink_attempt'
import SojalinkStepLog from '#models/sojalink_step_log'

/**
 * Fixture de données pour le développement du frontend : une trentaine
 * d'automatisations (règle + pipeline) réparties sur autant de domaines
 * métier, chacune avec quelques events déjà dans leur état final
 * (processed / failed / pending, avec attempts et step logs).
 *
 * Contrairement aux seeders de database/seeders/scenarios/ (un event
 * `pending` à la fois, traité en direct par le worker), celui-ci écrit
 * tout directement : pas besoin du worker pour avoir du contenu.
 *
 * Restreint à `development`. Rejoué par un `node ace db:seed` global,
 * ou isolément :
 *   node ace db:seed --files "database/seeders/fixtures/frontend_demo_seeder.ts"
 */

type AutomationStep = { key: string }

type AutomationDef = {
  code: string
  label: string
  eventTypeCode: string
  eventTypeLabel: string
  sourceApp: string
  priority: number
  isActive?: boolean
  broken?: boolean
  steps: AutomationStep[]
  sampleLabel: string
}

const HANDLER = 'email_notification'

const AUTOMATIONS: AutomationDef[] = [
  {
    code: 'sojadispro-order-to-toki-task',
    label: 'Commande SojadisPro vers tâche Toki',
    eventTypeCode: 'sojadispro.order.created',
    eventTypeLabel: 'Commande SojadisPro créée',
    sourceApp: 'SojadisPro',
    priority: 5,
    steps: [{ key: 'notify_team' }, { key: 'notify_manager' }],
    sampleLabel: 'commande Perrier 24x33cl',
  },
  {
    code: 'sojadispro-invoice-to-accounting',
    label: 'Facture SojadisPro vers comptabilité',
    eventTypeCode: 'sojadispro.invoice.paid',
    eventTypeLabel: 'Facture SojadisPro payée',
    sourceApp: 'SojadisPro',
    priority: 5,
    steps: [{ key: 'notify_accounting' }],
    sampleLabel: 'facture #INV-2026-0842',
  },
  {
    code: 'sojadispro-legacy-erp-sync',
    label: 'Synchronisation ERP legacy (pipeline cassé)',
    eventTypeCode: 'sojadispro.order.created',
    eventTypeLabel: 'Commande SojadisPro créée',
    sourceApp: 'LegacyERP',
    priority: 50,
    broken: true,
    steps: [{ key: 'sync_erp' }],
    sampleLabel: 'commande LegacyERP',
  },
  {
    code: 'toki-task-to-slack-notification',
    label: 'Tâche Toki vers notification Slack',
    eventTypeCode: 'toki.task.updated',
    eventTypeLabel: 'Tâche Toki mise à jour',
    sourceApp: 'Toki',
    priority: 10,
    isActive: false,
    steps: [{ key: 'notify_slack' }],
    sampleLabel: 'Contrôle qualité lot 88',
  },
  {
    code: 'crm-contact-to-newsletter',
    label: 'Contact CRM vers newsletter',
    eventTypeCode: 'crm.contact.updated',
    eventTypeLabel: 'Contact CRM mis à jour',
    sourceApp: 'CRM',
    priority: 5,
    steps: [{ key: 'subscribe_newsletter' }],
    sampleLabel: 'contact@client.fr',
  },
  {
    code: 'crm-contact-to-sales-team',
    label: 'Nouveau contact CRM vers équipe commerciale',
    eventTypeCode: 'crm.contact.created',
    eventTypeLabel: 'Nouveau contact CRM',
    sourceApp: 'CRM',
    priority: 5,
    steps: [{ key: 'notify_sales_team' }],
    sampleLabel: 'prospect Boulangerie Martin',
  },
  {
    code: 'stock-low-to-purchase-order',
    label: 'Stock bas vers commande fournisseur',
    eventTypeCode: 'stock.level.low',
    eventTypeLabel: "Stock sous le seuil d'alerte",
    sourceApp: 'WMS',
    priority: 5,
    steps: [{ key: 'notify_purchasing' }],
    sampleLabel: 'référence PET-500ML sous seuil',
  },
  {
    code: 'stock-received-to-toki-task',
    label: 'Réception stock vers tâche Toki',
    eventTypeCode: 'stock.received',
    eventTypeLabel: 'Réception de stock',
    sourceApp: 'WMS',
    priority: 5,
    steps: [{ key: 'notify_warehouse' }, { key: 'create_toki_task' }],
    sampleLabel: 'réception palette fournisseur Danone',
  },
  {
    code: 'delivery-shipped-to-customer-email',
    label: 'Livraison expédiée vers email client',
    eventTypeCode: 'delivery.shipped',
    eventTypeLabel: 'Livraison expédiée',
    sourceApp: 'TMS',
    priority: 5,
    steps: [{ key: 'notify_customer' }],
    sampleLabel: 'colis #TMS-77421',
  },
  {
    code: 'delivery-delayed-to-support-alert',
    label: 'Livraison en retard vers alerte support',
    eventTypeCode: 'delivery.delayed',
    eventTypeLabel: 'Livraison en retard',
    sourceApp: 'TMS',
    priority: 3,
    steps: [{ key: 'notify_support' }],
    sampleLabel: 'livraison #TMS-77500 en retard de 2j',
  },
  {
    code: 'support-ticket-created-to-slack',
    label: 'Nouveau ticket support vers Slack',
    eventTypeCode: 'support.ticket.created',
    eventTypeLabel: 'Nouveau ticket support',
    sourceApp: 'Zendesk',
    priority: 5,
    steps: [{ key: 'notify_slack_channel' }],
    sampleLabel: 'ticket #TCK-1832 : accès bloqué',
  },
  {
    code: 'support-ticket-escalated-to-manager',
    label: 'Ticket support escaladé vers manager',
    eventTypeCode: 'support.ticket.escalated',
    eventTypeLabel: 'Ticket support escaladé',
    sourceApp: 'Zendesk',
    priority: 1,
    steps: [{ key: 'notify_manager' }, { key: 'notify_oncall' }],
    sampleLabel: 'ticket #TCK-1840 escaladé niveau 2',
  },
  {
    code: 'payment-received-to-invoice-close',
    label: 'Paiement reçu vers clôture facture',
    eventTypeCode: 'payment.received',
    eventTypeLabel: 'Paiement reçu',
    sourceApp: 'Stripe',
    priority: 5,
    steps: [{ key: 'close_invoice' }],
    sampleLabel: 'facture #INV-2026-0901 réglée',
  },
  {
    code: 'payment-failed-to-finance-alert',
    label: 'Paiement échoué vers alerte finance',
    eventTypeCode: 'payment.failed',
    eventTypeLabel: 'Paiement échoué',
    sourceApp: 'Stripe',
    priority: 3,
    broken: true,
    steps: [{ key: 'alert_finance' }],
    sampleLabel: 'paiement Stripe échoué',
  },
  {
    code: 'refund-issued-to-accounting',
    label: 'Avoir émis vers comptabilité',
    eventTypeCode: 'refund.issued',
    eventTypeLabel: 'Avoir émis',
    sourceApp: 'SojadisPro',
    priority: 5,
    steps: [{ key: 'notify_accounting' }],
    sampleLabel: 'avoir #AV-0032',
  },
  {
    code: 'quote-accepted-to-order-creation',
    label: 'Devis accepté vers création commande',
    eventTypeCode: 'quote.accepted',
    eventTypeLabel: 'Devis accepté',
    sourceApp: 'SojadisPro',
    priority: 5,
    steps: [{ key: 'create_order' }, { key: 'notify_sales_team' }],
    sampleLabel: 'devis #DEV-2201 accepté',
  },
  {
    code: 'quote-expired-to-sales-reminder',
    label: 'Devis expiré vers relance commerciale',
    eventTypeCode: 'quote.expired',
    eventTypeLabel: 'Devis expiré',
    sourceApp: 'SojadisPro',
    priority: 10,
    isActive: false,
    steps: [{ key: 'notify_sales_team' }],
    sampleLabel: 'devis #DEV-2150 expiré',
  },
  {
    code: 'user-created-to-welcome-email',
    label: 'Nouvel utilisateur vers email de bienvenue',
    eventTypeCode: 'user.created',
    eventTypeLabel: 'Nouvel utilisateur créé',
    sourceApp: 'SojaLink',
    priority: 5,
    steps: [{ key: 'send_welcome_email' }],
    sampleLabel: 'compte marie.dupont@client.fr',
  },
  {
    code: 'user-deactivated-to-access-revoke',
    label: 'Utilisateur désactivé vers révocation accès',
    eventTypeCode: 'user.deactivated',
    eventTypeLabel: 'Utilisateur désactivé',
    sourceApp: 'SojaLink',
    priority: 5,
    steps: [{ key: 'revoke_access' }],
    sampleLabel: 'compte jean.durand désactivé',
  },
  {
    code: 'worksheet-completed-to-billing',
    label: 'Fiche de travail terminée vers facturation',
    eventTypeCode: 'worksheet.completed',
    eventTypeLabel: 'Fiche de travail terminée',
    sourceApp: 'SojadisPro',
    priority: 5,
    steps: [{ key: 'trigger_billing' }],
    sampleLabel: 'fiche #WS-3391 terminée',
  },
  {
    code: 'worksheet-rejected-to-quality-team',
    label: 'Fiche de travail rejetée vers équipe qualité',
    eventTypeCode: 'worksheet.rejected',
    eventTypeLabel: 'Fiche de travail rejetée',
    sourceApp: 'SojadisPro',
    priority: 3,
    steps: [{ key: 'notify_quality_team' }],
    sampleLabel: 'fiche #WS-3402 rejetée (non-conformité)',
  },
  {
    code: 'contract-signed-to-toki-task',
    label: 'Contrat signé vers tâche Toki',
    eventTypeCode: 'contract.signed',
    eventTypeLabel: 'Contrat signé',
    sourceApp: 'DocuSign',
    priority: 5,
    steps: [{ key: 'create_toki_task' }, { key: 'notify_legal' }],
    sampleLabel: 'contrat #CT-118 signé',
  },
  {
    code: 'contract-expiring-to-renewal-alert',
    label: 'Contrat arrivant à échéance vers alerte renouvellement',
    eventTypeCode: 'contract.expiring',
    eventTypeLabel: 'Contrat arrivant à échéance',
    sourceApp: 'DocuSign',
    priority: 5,
    steps: [{ key: 'notify_account_manager' }],
    sampleLabel: 'contrat #CT-092 arrive à échéance',
  },
  {
    code: 'inventory-adjustment-to-audit-log',
    label: "Ajustement inventaire vers journal d'audit",
    eventTypeCode: 'inventory.adjusted',
    eventTypeLabel: "Ajustement d'inventaire",
    sourceApp: 'WMS',
    priority: 10,
    steps: [{ key: 'write_audit_log' }],
    sampleLabel: 'ajustement stock -12 unités réf. EAU-1L',
  },
  {
    code: 'supplier-order-confirmed-to-warehouse',
    label: 'Commande fournisseur confirmée vers entrepôt',
    eventTypeCode: 'supplier_order.confirmed',
    eventTypeLabel: 'Commande fournisseur confirmée',
    sourceApp: 'SojadisPro',
    priority: 5,
    steps: [{ key: 'notify_warehouse' }],
    sampleLabel: 'commande fournisseur #PO-552 confirmée',
  },
  {
    code: 'supplier-order-delayed-to-purchasing',
    label: 'Commande fournisseur en retard vers achats',
    eventTypeCode: 'supplier_order.delayed',
    eventTypeLabel: 'Commande fournisseur en retard',
    sourceApp: 'SojadisPro',
    priority: 3,
    steps: [{ key: 'notify_purchasing' }],
    sampleLabel: 'commande fournisseur #PO-560 en retard',
  },
  {
    code: 'return-received-to-refund-process',
    label: 'Retour reçu vers processus de remboursement',
    eventTypeCode: 'return.received',
    eventTypeLabel: 'Retour reçu',
    sourceApp: 'SojadisPro',
    priority: 5,
    steps: [{ key: 'notify_warehouse' }, { key: 'trigger_refund' }],
    sampleLabel: 'retour #RET-221 reçu entrepôt',
  },
  {
    code: 'complaint-filed-to-quality-team',
    label: 'Réclamation déposée vers équipe qualité',
    eventTypeCode: 'complaint.filed',
    eventTypeLabel: 'Réclamation déposée',
    sourceApp: 'SojadisPro',
    priority: 1,
    steps: [{ key: 'notify_quality_team' }],
    sampleLabel: 'réclamation #REC-77 (produit endommagé)',
  },
  {
    code: 'price-updated-to-catalog-sync',
    label: 'Prix mis à jour vers synchro catalogue',
    eventTypeCode: 'price.updated',
    eventTypeLabel: 'Tarif mis à jour',
    sourceApp: 'SojadisPro',
    priority: 10,
    isActive: false,
    steps: [{ key: 'sync_catalog' }],
    sampleLabel: 'tarif catégorie Eaux plates mis à jour',
  },
  {
    code: 'employee-onboarded-to-it-provisioning',
    label: 'Employé onboardé vers provisioning IT',
    eventTypeCode: 'employee.onboarded',
    eventTypeLabel: 'Employé onboardé',
    sourceApp: 'HRIS',
    priority: 5,
    steps: [{ key: 'notify_it' }, { key: 'create_accounts' }],
    sampleLabel: 'nouvel employé Camille Petit (Logistique)',
  },
]

export default class FrontendDemoSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    const now = DateTime.utc()

    for (const [index, automation] of AUTOMATIONS.entries()) {
      const eventType = await SojalinkEventType.updateOrCreate(
        { code: automation.eventTypeCode },
        { code: automation.eventTypeCode, label: automation.eventTypeLabel, isActive: true }
      )

      const rule = await SojalinkRule.updateOrCreate(
        { code: automation.code },
        {
          code: automation.code,
          label: automation.label,
          eventTypeId: eventType.id,
          priority: automation.priority,
          isActive: automation.isActive ?? true,
        }
      )

      const ruleVersion = await SojalinkRuleVersion.updateOrCreate(
        { ruleId: rule.id, versionNumber: 1 },
        {
          ruleId: rule.id,
          versionNumber: 1,
          isActive: true,
          conditionsJson: JSON.stringify({
            op: 'eq',
            field: 'sourceApp',
            value: automation.sourceApp,
          }),
          pipelineJson: this.buildPipelineJson(automation),
        }
      )

      await this.seedEventsForAutomation(automation, eventType.id, ruleVersion, index, now)
    }

    await this.seedOrphanEvents(now)
  }

  private buildPipelineJson(automation: AutomationDef) {
    if (automation.broken) {
      return JSON.stringify({
        steps: [{ key: automation.steps[0].key, handler: 'unregistered_handler' }],
      })
    }

    return JSON.stringify({
      steps: automation.steps.map((step, index) => ({
        key: step.key,
        handler: HANDLER,
        input:
          index === 0
            ? { message: 'Event {{ event.id }}: {{ event.payload.label }}' }
            : {
                previous_sent: `{{ steps.${automation.steps[0].key}.sent }}`,
                app: '{{ event.sourceApp }}',
              },
      })),
    })
  }

  private resolvedSteps(automation: AutomationDef, entityId: number) {
    return automation.steps.map((step, index) => ({
      key: step.key,
      handler: HANDLER,
      input:
        index === 0
          ? { message: `Event ${entityId}: ${automation.sampleLabel}` }
          : { previous_sent: true, app: automation.sourceApp },
      output: { sent: true },
    }))
  }

  private async seedEventsForAutomation(
    automation: AutomationDef,
    eventTypeId: number,
    ruleVersion: SojalinkRuleVersion,
    index: number,
    now: DateTime
  ) {
    const baseEntityId = 1000 + index * 10

    if (automation.broken) {
      // Une règle au pipeline invalide n'exécute jamais aucun step : pas
      // d'events "processed" possibles, uniquement des rejets tracés.
      await this.seedPipelineRejectedEvent({
        eventTypeId,
        ruleVersion,
        sourceApp: automation.sourceApp,
        sourceEntityType: 'record',
        sourceEntityId: baseEntityId + 1,
        payload: { id: baseEntityId + 1 },
        createdAt: now.minus({ hours: (index % 10) + 1 }),
        errorMessage: 'Handler "unregistered_handler" is not registered',
      })
      await this.seedPipelineRejectedEvent({
        eventTypeId,
        ruleVersion,
        sourceApp: automation.sourceApp,
        sourceEntityType: 'record',
        sourceEntityId: baseEntityId + 2,
        payload: { id: baseEntityId + 2 },
        createdAt: now.minus({ days: (index % 6) + 1 }),
        errorMessage: 'Handler "unregistered_handler" is not registered',
      })
      return
    }

    await this.seedProcessedEvent({
      eventTypeId,
      ruleVersion,
      sourceApp: automation.sourceApp,
      sourceEntityType: 'record',
      sourceEntityId: baseEntityId + 1,
      payload: { id: baseEntityId + 1, label: automation.sampleLabel },
      createdAt: now.minus({ hours: (index % 22) + 1 }),
      steps: this.resolvedSteps(automation, baseEntityId + 1),
    })

    await this.seedProcessedEvent({
      eventTypeId,
      ruleVersion,
      sourceApp: automation.sourceApp,
      sourceEntityType: 'record',
      sourceEntityId: baseEntityId + 2,
      payload: { id: baseEntityId + 2, label: automation.sampleLabel },
      createdAt: now.minus({ days: (index % 12) + 2 }),
      steps: this.resolvedSteps(automation, baseEntityId + 2),
    })

    if (index % 4 === 0) {
      await this.seedFailingStepEvent({
        eventTypeId,
        ruleVersion,
        sourceApp: automation.sourceApp,
        sourceEntityType: 'record',
        sourceEntityId: baseEntityId + 3,
        payload: { id: baseEntityId + 3 }, // pas de "label" -> template non résolu
        createdAt: now.minus({ hours: (index % 14) + 2 }),
        succeededSteps: [],
        failingStep: {
          key: automation.steps[0].key,
          handler: HANDLER,
          input: {},
          errorMessage: 'Cannot resolve reference "{{ event.payload.label }}"',
        },
      })
      return
    }

    if (index % 6 === 0) {
      await this.seedPendingEvent({
        eventTypeId,
        sourceApp: automation.sourceApp,
        sourceEntityType: 'record',
        sourceEntityId: baseEntityId + 3,
        payload: { id: baseEntityId + 3, label: automation.sampleLabel },
        createdAt: now.minus({ minutes: (index + 1) * 7 }),
      })
      return
    }

    await this.seedProcessedEvent({
      eventTypeId,
      ruleVersion,
      sourceApp: automation.sourceApp,
      sourceEntityType: 'record',
      sourceEntityId: baseEntityId + 3,
      payload: { id: baseEntityId + 3, label: automation.sampleLabel },
      createdAt: now.minus({ hours: (index % 18) + 3 }),
      steps: this.resolvedSteps(automation, baseEntityId + 3),
    })
  }

  private async seedOrphanEvents(now: DateTime) {
    const order = await SojalinkEventType.findByOrFail('code', 'sojadispro.order.created')

    await this.seedNoMatchingRuleEvent({
      eventTypeId: order.id,
      sourceApp: 'UnknownApp',
      sourceEntityType: 'record',
      sourceEntityId: 9901,
      payload: { id: 9901 },
      createdAt: now.minus({ hours: 1 }),
    })
    await this.seedNoMatchingRuleEvent({
      eventTypeId: order.id,
      sourceApp: 'UnknownApp',
      sourceEntityType: 'record',
      sourceEntityId: 9902,
      payload: { id: 9902 },
      createdAt: now.minus({ days: 2 }),
    })
  }

  private async findExistingEvent(key: {
    eventTypeId: number
    sourceApp: string
    sourceEntityType: string
    sourceEntityId: number
  }) {
    return SojalinkEvent.query()
      .where('eventTypeId', key.eventTypeId)
      .where('sourceApp', key.sourceApp)
      .where('sourceEntityType', key.sourceEntityType)
      .where('sourceEntityId', key.sourceEntityId)
      .first()
  }

  private async seedProcessedEvent(opts: {
    eventTypeId: number
    ruleVersion: SojalinkRuleVersion
    sourceApp: string
    sourceEntityType: string
    sourceEntityId: number
    payload: Record<string, unknown>
    createdAt: DateTime
    steps: {
      key: string
      handler: string
      input: Record<string, unknown>
      output: Record<string, unknown>
    }[]
  }) {
    if (await this.findExistingEvent(opts)) return

    const resolvedAt = opts.createdAt.plus({ seconds: 1 })
    const finishedAt = opts.createdAt.plus({ seconds: 3 })

    const event = await SojalinkEvent.create({
      eventTypeId: opts.eventTypeId,
      appliedRuleVersionId: opts.ruleVersion.id,
      sourceApp: opts.sourceApp,
      sourceEntityType: opts.sourceEntityType,
      sourceEntityId: opts.sourceEntityId,
      status: 'processed',
      payloadJson: JSON.stringify(opts.payload),
      resolutionSnapshotJson: JSON.stringify({
        ruleVersionId: opts.ruleVersion.id,
        resolvedAt: resolvedAt.toISO(),
      }),
      processingStartedAt: resolvedAt,
      resolvedAt,
      processedAt: finishedAt,
      createdAt: opts.createdAt,
    })

    const attempt = await SojalinkAttempt.create({
      eventId: event.id,
      attemptNumber: 1,
      status: 'success',
      startedAt: resolvedAt,
      finishedAt,
    })

    await SojalinkStepLog.createMany(
      opts.steps.map((step, index) => ({
        attemptId: attempt.id,
        stepIndex: index,
        stepCode: step.key,
        handlerName: step.handler,
        status: 'success' as const,
        inputJson: JSON.stringify(step.input),
        outputJson: JSON.stringify(step.output),
        startedAt: resolvedAt.plus({ seconds: index }),
        finishedAt,
      }))
    )
  }

  private async seedFailingStepEvent(opts: {
    eventTypeId: number
    ruleVersion: SojalinkRuleVersion
    sourceApp: string
    sourceEntityType: string
    sourceEntityId: number
    payload: Record<string, unknown>
    createdAt: DateTime
    succeededSteps: {
      key: string
      handler: string
      input: Record<string, unknown>
      output: Record<string, unknown>
    }[]
    failingStep: {
      key: string
      handler: string
      input: Record<string, unknown>
      errorMessage: string
    }
  }) {
    if (await this.findExistingEvent(opts)) return

    const resolvedAt = opts.createdAt.plus({ seconds: 1 })
    const finishedAt = opts.createdAt.plus({ seconds: 3 })

    const event = await SojalinkEvent.create({
      eventTypeId: opts.eventTypeId,
      appliedRuleVersionId: opts.ruleVersion.id,
      sourceApp: opts.sourceApp,
      sourceEntityType: opts.sourceEntityType,
      sourceEntityId: opts.sourceEntityId,
      status: 'failed',
      payloadJson: JSON.stringify(opts.payload),
      resolutionSnapshotJson: JSON.stringify({
        ruleVersionId: opts.ruleVersion.id,
        resolvedAt: resolvedAt.toISO(),
      }),
      processingStartedAt: resolvedAt,
      resolvedAt,
      failedAt: finishedAt,
      createdAt: opts.createdAt,
    })

    const attempt = await SojalinkAttempt.create({
      eventId: event.id,
      attemptNumber: 1,
      status: 'failed',
      errorCode: 'InputResolutionError',
      errorMessage: opts.failingStep.errorMessage,
      startedAt: resolvedAt,
      finishedAt,
    })

    await SojalinkStepLog.createMany([
      ...opts.succeededSteps.map((step, index) => ({
        attemptId: attempt.id,
        stepIndex: index,
        stepCode: step.key,
        handlerName: step.handler,
        status: 'success' as const,
        inputJson: JSON.stringify(step.input),
        outputJson: JSON.stringify(step.output),
        startedAt: resolvedAt.plus({ seconds: index }),
        finishedAt,
      })),
      {
        attemptId: attempt.id,
        stepIndex: opts.succeededSteps.length,
        stepCode: opts.failingStep.key,
        handlerName: opts.failingStep.handler,
        status: 'failed' as const,
        inputJson: JSON.stringify(opts.failingStep.input),
        outputJson: null,
        errorCode: 'InputResolutionError',
        errorMessage: opts.failingStep.errorMessage,
        startedAt: resolvedAt.plus({ seconds: opts.succeededSteps.length }),
        finishedAt,
      },
    ])
  }

  private async seedPipelineRejectedEvent(opts: {
    eventTypeId: number
    ruleVersion: SojalinkRuleVersion
    sourceApp: string
    sourceEntityType: string
    sourceEntityId: number
    payload: Record<string, unknown>
    createdAt: DateTime
    errorMessage: string
  }) {
    if (await this.findExistingEvent(opts)) return

    const resolvedAt = opts.createdAt.plus({ seconds: 1 })

    const event = await SojalinkEvent.create({
      eventTypeId: opts.eventTypeId,
      appliedRuleVersionId: opts.ruleVersion.id,
      sourceApp: opts.sourceApp,
      sourceEntityType: opts.sourceEntityType,
      sourceEntityId: opts.sourceEntityId,
      status: 'failed',
      payloadJson: JSON.stringify(opts.payload),
      resolutionSnapshotJson: JSON.stringify({
        ruleVersionId: opts.ruleVersion.id,
        resolvedAt: resolvedAt.toISO(),
      }),
      processingStartedAt: resolvedAt,
      resolvedAt,
      failedAt: resolvedAt,
      createdAt: opts.createdAt,
    })

    await SojalinkAttempt.create({
      eventId: event.id,
      attemptNumber: 1,
      status: 'failed',
      errorCode: 'PipelineValidationError',
      errorMessage: opts.errorMessage,
      startedAt: resolvedAt,
      finishedAt: resolvedAt,
    })
  }

  private async seedNoMatchingRuleEvent(opts: {
    eventTypeId: number
    sourceApp: string
    sourceEntityType: string
    sourceEntityId: number
    payload: Record<string, unknown>
    createdAt: DateTime
  }) {
    if (await this.findExistingEvent(opts)) return

    await SojalinkEvent.create({
      eventTypeId: opts.eventTypeId,
      sourceApp: opts.sourceApp,
      sourceEntityType: opts.sourceEntityType,
      sourceEntityId: opts.sourceEntityId,
      status: 'failed',
      payloadJson: JSON.stringify(opts.payload),
      resolutionErrorCode: 'NoMatchingRuleError',
      resolutionErrorMessage: `No rule matches event (sourceApp=${opts.sourceApp})`,
      failedAt: opts.createdAt.plus({ seconds: 1 }),
      createdAt: opts.createdAt,
    })
  }

  private async seedPendingEvent(opts: {
    eventTypeId: number
    sourceApp: string
    sourceEntityType: string
    sourceEntityId: number
    payload: Record<string, unknown>
    createdAt: DateTime
  }) {
    if (await this.findExistingEvent(opts)) return

    await SojalinkEvent.create({
      eventTypeId: opts.eventTypeId,
      sourceApp: opts.sourceApp,
      sourceEntityType: opts.sourceEntityType,
      sourceEntityId: opts.sourceEntityId,
      status: 'pending',
      payloadJson: JSON.stringify(opts.payload),
      createdAt: opts.createdAt,
    })
  }
}
