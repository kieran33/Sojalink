import { configApp } from '@adonisjs/eslint-config'

const lucidModelImports = [
  '#models/sojalink_event',
  '#models/event_type',
  '#models/rule',
  '#models/rule_version',
  '#models/entity_correlation',
].map((name) => ({
  name,
  message:
    'Les modèles Lucid sont réservés à app/persistence. Utilise un objet métier exposé par app/domain.',
}))

export default [
  ...configApp(),

  {
    files: ['app/**/*.ts'],
    ignores: ['app/models/**/*.ts', 'app/persistence/**/*.ts'],
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
