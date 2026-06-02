import type { ProcessingEvent } from '#domain/events/event'

export class EventProcessor {
  async process(_event: ProcessingEvent): Promise<void> {
    /**
     * TODO:
     * - Identifier le type d’event
     * - Charger les règles applicables
     * - Résoudre la version de règle à appliquer
     * - Exécuter l’action associée
     */

    return
  }
}
