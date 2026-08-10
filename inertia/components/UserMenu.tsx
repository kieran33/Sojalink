import { Link } from '@adonisjs/inertia/react'
import { LogOutIcon, UserIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type UserMenuProps = {
  username: string
}

export function UserMenu({ username }: UserMenuProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <UserIcon className="h-4 w-4" />
        {username}
      </div>
      <Link
        href="/deconnexion"
        method="post"
        as="button"
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
      >
        <LogOutIcon className="h-4 w-4" />
      </Link>
    </div>
  )
}
