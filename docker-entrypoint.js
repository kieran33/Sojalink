import { execSync } from 'node:child_process'

console.log('Running migrations...')
try {
  execSync('node ace migration:run --force', { stdio: 'inherit' })
  console.log('Migrations done.')
} catch (error) {
  console.error('Migration failed:', error)
  process.exit(1)
}

console.log('Starting server...')
await import('./bin/server.js')