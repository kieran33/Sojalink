import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'
import app from '@adonisjs/core/services/app'

const dbConfig = defineConfig({
  connection: 'mysql',

  connections: {
    mysql: {
      client: 'mysql2',

      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
      },

      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      seeders: {
        // "main" runs on a plain `node ace db:seed`; "scenarios" holds the
        // manual-testing scenario seeders (development only, see
        // docs/manual-testing.md), cherry-pickable with `db:seed --files`.
        paths: [
          './database/seeders/main',
          './database/seeders/scenarios',
          './database/seeders/fixtures',
        ],
      },
      /**
       * Emit SQL queries to the logger in development.
       */
      debug: app.inDev,
    },
  },
})

export default dbConfig
