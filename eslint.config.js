import { configApp } from '@adonisjs/eslint-config'

const lucidModelImports = [
  '#models/sojalink_event',
  '#models/sojalink_event_type',
  '#models/sojalink_rule',
  '#models/sojalink_rule_version',
  '#models/sojalink_attempt',
  '#models/sojalink_step_log',
  '#models/sojalink_entity_correlation',
].map((name) => ({
  name,
  message:
    'Les modèles Lucid sont réservés à app/persistence et app/http. Utilise un objet métier exposé par app/domain.',
}))

export default [
  ...configApp(),

  {
    // Generated file (node ace migration:run), not formatted by hand.
    ignores: ['database/schema.ts'],
  },

  {
    files: ['app/**/*.ts'],
    ignores: ['app/models/**/*.ts', 'app/persistence/**/*.ts', 'app/http/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: lucidModelImports,
        },
      ],
    },
  },
]
