import { useForm, usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PasswordInput } from '@/components/PasswordInput'
import { type Data } from '@generated/data'

export default function Register() {
  const { flash } = usePage<Data.SharedProps>().props
  const form = useForm({ username: '', password: '' })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    form.post('/inscription')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Inscription</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {flash.error && <p className="text-sm text-destructive">{flash.error}</p>}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-sm font-medium">
                Nom d'utilisateur
              </label>
              <Input
                id="username"
                name="username"
                value={form.data.username}
                onChange={(event) => form.setData('username', event.target.value)}
                autoComplete="username"
              />
              {form.errors.username && (
                <p className="text-sm text-destructive">{form.errors.username}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Mot de passe
              </label>
              <PasswordInput
                id="password"
                name="password"
                value={form.data.password}
                onChange={(value) => form.setData('password', value)}
                autoComplete="new-password"
              />
              {form.errors.password && (
                <p className="text-sm text-destructive">{form.errors.password}</p>
              )}
            </div>

            <Button type="submit" disabled={form.processing}>
              S'inscrire
            </Button>

            <Link
              href="/connexion"
              className="text-center text-sm text-muted-foreground hover:underline"
            >
              Déjà un compte ? Se connecter
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
