import { type Data } from '@generated/data'
import { toast, Toaster } from 'sonner'
import { usePage } from '@inertiajs/react'
import { type ReactElement, useEffect } from 'react'
import { AppSidebar } from '~/components/AppSidebar'
import { ThemeToggle } from '~/components/ThemeToggle'
import { UserMenu } from '~/components/UserMenu'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { WorkerStatusBadge } from '~/components/WorkerStatusBadge'

export default function Layout({ children }: { children: ReactElement<Data.SharedProps> }) {
  useEffect(() => {
    toast.dismiss()
  }, [usePage().url])

  useEffect(() => {
    if (children.props.flash.error) {
      toast.error(children.props.flash.error)
    }
    if (children.props.flash.success) {
      toast.success(children.props.flash.success)
    }
  })

  if (!children.props.user) {
    return (
      <>
        {children}
        <Toaster position="top-center" richColors />
      </>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-4" />
          </div>
          <div className="flex items-center gap-3">
            <WorkerStatusBadge {...children.props.worker} />
            <UserMenu username={children.props.user.username} />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
      <Toaster position="top-center" richColors />
    </SidebarProvider>
  )
}
