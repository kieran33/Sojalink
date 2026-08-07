import { LayoutDashboardIcon } from 'lucide-react'
import { usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

const navMain = [
  {
    title: 'Dashboard',
    route: 'dashboard',
    href: '/dashboard',
    icon: LayoutDashboardIcon,
  },
] as const

export function AppSidebar() {
  const { url } = usePage()

  return (
    <Sidebar variant="floating" collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <span className="font-semibold">SojaLink</span>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Automatisations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.route}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={url.startsWith(item.href)}
                    render={<Link route={item.route} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
