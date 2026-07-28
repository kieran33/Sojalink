import { execSync } from 'node:child_process'

console.log('Resetting database...')
try {
  execSync('node ace migration:fresh --force', { stdio: 'inherit' })
  console.log('Migration done.')
} catch (error) {
  console.log('Migration failed, continuing...')
}

console.log('Starting server...')
await import('./bin/server.js')