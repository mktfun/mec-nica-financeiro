# Dashboard Layout & Responsive App Shell Reference

A production-ready, fully responsive SaaS application shell built with Next.js App Router, Tailwind CSS, Radix UI primitives, and `lucide-react`.

---

## 1. Features & Capabilities

- **Collapsible Sidebar**: Desktop fixed/collapsible sidebar with workspace switcher, navigation groups, active indicators, and badge counts.
- **Mobile Drawer**: Slide-over sheet navigation (`Sheet`) triggered via mobile top-bar hamburger button.
- **Sticky Header**: Glassmorphism navbar (`backdrop-blur-md`) with dynamic breadcrumbs, notification bell with unread ping, and user profile dropdown.
- **Command Palette (`Cmd+K`)**: Keyboard-driven command search modal (`CommandDialog`) with instant search across pages, tools, and actions.
- **Workspace Switcher**: Multi-tenant workspace selector dropdown with active check indicator.
- **Accessibility**: Keyboard navigable, Radix focus trap compliant, screen reader ARIA labels.

---

## 2. Complete Production Implementation

Save the following component as `@/components/layout/dashboard-layout.tsx`:

```tsx
'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Settings,
  CreditCard,
  Search,
  Bell,
  Menu,
  ChevronDown,
  ChevronRight,
  Command,
  LogOut,
  User,
  Sparkles,
  Check,
  ChevronsUpDown,
  FolderKanban,
  ShieldCheck,
  HelpCircle,
  PlusCircle,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// ==========================================
// Types & Navigation Definition
// ==========================================

export interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive'
  children?: Array<{
    title: string
    href: string
    badge?: string
  }>
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export interface Workspace {
  id: string
  name: string
  plan: string
  avatarUrl?: string
}

export interface UserProfile {
  name: string
  email: string
  avatarUrl?: string
  role: string
}

const DEFAULT_WORKSPACES: Workspace[] = [
  { id: 'ws-1', name: 'Acme Corp', plan: 'Enterprise' },
  { id: 'ws-2', name: 'Starlight Labs', plan: 'Pro' },
]

const NAVIGATION_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: 'Analytics',
        href: '/dashboard/analytics',
        icon: BarChart3,
        badge: 'Live',
      },
    ],
  },
  {
    title: 'Management',
    items: [
      {
        title: 'Projects',
        href: '/dashboard/projects',
        icon: FolderKanban,
        badge: 12,
        children: [
          { title: 'All Projects', href: '/dashboard/projects' },
          { title: 'Active Sprints', href: '/dashboard/projects/sprints' },
          { title: 'Archived', href: '/dashboard/projects/archived' },
        ],
      },
      {
        title: 'Team Members',
        href: '/dashboard/team',
        icon: Users,
      },
      {
        title: 'Billing & Plans',
        href: '/dashboard/billing',
        icon: CreditCard,
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        title: 'Settings',
        href: '/dashboard/settings',
        icon: Settings,
      },
      {
        title: 'Audit Logs',
        href: '/dashboard/audit',
        icon: ShieldCheck,
      },
    ],
  },
]

// ==========================================
// Main Dashboard Layout Component
// ==========================================

export interface DashboardLayoutProps {
  children: React.ReactNode
  user?: UserProfile
  workspaces?: Workspace[]
}

export function DashboardLayout({
  children,
  user = {
    name: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    role: 'Owner',
  },
  workspaces = DEFAULT_WORKSPACES,
}: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()

  const [activeWorkspace, setActiveWorkspace] = React.useState<Workspace>(
    workspaces[0] || { id: 'ws-1', name: 'Default Workspace', plan: 'Pro' }
  )
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState<boolean>(false)
  const [commandOpen, setCommandOpen] = React.useState<boolean>(false)

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleCommandSelect = (href: string) => {
    setCommandOpen(false)
    router.push(href)
  }

  return (
    <div className="flex min-h-screen w-full bg-zinc-950 text-zinc-100 antialiased">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 z-30 border-r border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
        <SidebarContent
          pathname={pathname}
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={setActiveWorkspace}
          user={user}
        />
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-72">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile Sheet Drawer Trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  aria-label="Toggle navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-72 p-0 border-r border-zinc-800 bg-zinc-950 text-zinc-100"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation Menu</SheetTitle>
                </SheetHeader>
                <SidebarContent
                  pathname={pathname}
                  workspaces={workspaces}
                  activeWorkspace={activeWorkspace}
                  onSelectWorkspace={(ws) => {
                    setActiveWorkspace(ws)
                    setMobileMenuOpen(false)
                  }}
                  onNavigate={() => setMobileMenuOpen(false)}
                  user={user}
                />
              </SheetContent>
            </Sheet>

            {/* Dynamic Breadcrumbs */}
            <DynamicBreadcrumbs pathname={pathname} />
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Global Search / Command Trigger */}
            <Button
              variant="outline"
              onClick={() => setCommandOpen(true)}
              className="relative h-9 w-9 p-0 sm:h-9 sm:w-60 sm:justify-start sm:px-3 border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200"
            >
              <Search className="h-4 w-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline-flex text-xs">Search pages & tools...</span>
              <kbd className="pointer-events-none hidden sm:inline-flex absolute right-2 top-2 h-5 select-none items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-400">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>

            {/* Notifications Bell */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative h-9 w-9 border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  aria-label="Open notifications"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-80 border-zinc-800 bg-zinc-900 text-zinc-100"
              >
                <DropdownMenuLabel className="font-semibold text-xs text-zinc-400 uppercase tracking-wider px-3 py-2">
                  Notifications
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <div className="p-3 space-y-2">
                  <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-200">Deployment Succeeded</span>
                      <span className="text-zinc-500">2m ago</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">
                      Production build v2.4.1 deployed to Vercel.
                    </p>
                  </div>
                  <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-200">New Team Invite</span>
                      <span className="text-zinc-500">1h ago</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">
                      Sarah joined Starlight Labs as Developer.
                    </p>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="h-6 bg-zinc-800" />

            {/* User Profile Dropdown */}
            <UserProfileDropdown user={user} activeWorkspace={activeWorkspace} />
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* 3. Global Command Palette Dialog */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <div className="border border-zinc-800 bg-zinc-950 text-zinc-100 rounded-lg overflow-hidden shadow-2xl">
          <CommandInput
            placeholder="Type a command or search..."
            className="border-none text-zinc-100 placeholder:text-zinc-500 focus:ring-0"
          />
          <CommandList className="max-h-80 border-t border-zinc-800 bg-zinc-950">
            <CommandEmpty className="p-4 text-center text-sm text-zinc-500">
              No results found.
            </CommandEmpty>
            <CommandGroup heading="Navigation">
              <CommandItem
                onSelect={() => handleCommandSelect('/dashboard')}
                className="hover:bg-zinc-900 cursor-pointer"
              >
                <LayoutDashboard className="mr-2 h-4 w-4 text-indigo-400" />
                <span>Dashboard Overview</span>
                <CommandShortcut>G D</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => handleCommandSelect('/dashboard/analytics')}
                className="hover:bg-zinc-900 cursor-pointer"
              >
                <BarChart3 className="mr-2 h-4 w-4 text-indigo-400" />
                <span>Analytics & Metrics</span>
                <CommandShortcut>G A</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => handleCommandSelect('/dashboard/projects')}
                className="hover:bg-zinc-900 cursor-pointer"
              >
                <FolderKanban className="mr-2 h-4 w-4 text-indigo-400" />
                <span>Projects & Sprints</span>
                <CommandShortcut>G P</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => handleCommandSelect('/dashboard/billing')}
                className="hover:bg-zinc-900 cursor-pointer"
              >
                <CreditCard className="mr-2 h-4 w-4 text-indigo-400" />
                <span>Billing & Invoices</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator className="bg-zinc-800" />
            <CommandGroup heading="Actions">
              <CommandItem
                onSelect={() => handleCommandSelect('/dashboard/projects/new')}
                className="hover:bg-zinc-900 cursor-pointer"
              >
                <PlusCircle className="mr-2 h-4 w-4 text-emerald-400" />
                <span>Create New Project</span>
                <CommandShortcut>⌘N</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => handleCommandSelect('/dashboard/settings')}
                className="hover:bg-zinc-900 cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4 text-zinc-400" />
                <span>Account Settings</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </div>
      </CommandDialog>
    </div>
  )
}

// ==========================================
// Subcomponent: Sidebar Content
// ==========================================

interface SidebarContentProps {
  pathname: string
  workspaces: Workspace[]
  activeWorkspace: Workspace
  onSelectWorkspace: (ws: Workspace) => void
  onNavigate?: () => void
  user: UserProfile
}

function SidebarContent({
  pathname,
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
  onNavigate,
  user,
}: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto px-4 py-5">
      <div className="space-y-6">
        {/* Workspace Switcher Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between border-zinc-800 bg-zinc-900/80 px-3 py-5 text-left hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-sm shadow-inner">
                  {activeWorkspace.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="font-semibold text-sm text-zinc-100 truncate max-w-[120px]">
                    {activeWorkspace.name}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {activeWorkspace.plan} Plan
                  </span>
                </div>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-zinc-400 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-64 border-zinc-800 bg-zinc-900 text-zinc-100"
          >
            <DropdownMenuLabel className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => onSelectWorkspace(ws)}
                className="flex items-center justify-between hover:bg-zinc-800 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800 text-xs text-zinc-200">
                    {ws.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm text-zinc-200">{ws.name}</span>
                </div>
                {activeWorkspace.id === ws.id && (
                  <Check className="h-4 w-4 text-indigo-400" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem
              onClick={() => onSelectWorkspace(activeWorkspace)}
              className="hover:bg-zinc-800 cursor-pointer text-indigo-400 font-medium"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Create Workspace</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Grouped Navigation */}
        <nav className="space-y-6">
          {NAVIGATION_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1.5">
              <h2 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                {section.title}
              </h2>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Sidebar Footer User Card */}
      <div className="pt-4 border-t border-zinc-800">
        <div className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8 border border-zinc-700">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback className="bg-zinc-800 text-xs text-zinc-300 font-medium">
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-left leading-tight truncate">
              <span className="text-xs font-semibold text-zinc-200 truncate max-w-[120px]">
                {user.name}
              </span>
              <span className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                {user.email}
              </span>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-[10px] px-1.5 py-0"
          >
            {user.role}
          </Badge>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// Subcomponent: Collapsible Nav Item
// ==========================================

interface SidebarNavItemProps {
  item: NavItem
  pathname: string
  onNavigate?: () => void
}

function SidebarNavItem({ item, pathname, onNavigate }: SidebarNavItemProps) {
  const Icon = item.icon
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
  const hasChildren = item.children && item.children.length > 0
  const [isOpen, setIsOpen] = React.useState<boolean>(isActive)

  if (hasChildren) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              'group flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors',
              isActive
                ? 'bg-zinc-900 text-zinc-100'
                : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
            )}
          >
            <div className="flex items-center gap-2.5">
              <Icon
                className={cn(
                  'h-4 w-4 transition-colors',
                  isActive ? 'text-indigo-400' : 'text-zinc-400 group-hover:text-zinc-200'
                )}
              />
              <span>{item.title}</span>
            </div>
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5 text-zinc-500 transition-transform duration-200',
                isOpen && 'rotate-90 text-zinc-300'
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-6 pt-1 space-y-1">
          {item.children?.map((subItem) => {
            const isSubActive = pathname === subItem.href
            return (
              <Link
                key={subItem.href}
                href={subItem.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center justify-between rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  isSubActive
                    ? 'bg-indigo-600/10 text-indigo-400 font-semibold'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                )}
              >
                <span>{subItem.title}</span>
                {subItem.badge && (
                  <Badge
                    variant="outline"
                    className="border-zinc-800 bg-zinc-900 text-[10px] text-zinc-400"
                  >
                    {subItem.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'group flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors',
        isActive
          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
      )}
    >
      <div className="flex items-center gap-2.5">
        <Icon
          className={cn(
            'h-4 w-4 transition-colors',
            isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
          )}
        />
        <span>{item.title}</span>
      </div>
      {item.badge !== undefined && (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
            isActive
              ? 'bg-white/20 text-white'
              : 'bg-zinc-800 text-zinc-300'
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  )
}

// ==========================================
// Subcomponent: Dynamic Breadcrumbs
// ==========================================

function DynamicBreadcrumbs({ pathname }: { pathname: string }) {
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="text-xs font-medium text-zinc-200">
              Dashboard
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  return (
    <Breadcrumb className="hidden sm:block">
      <BreadcrumbList className="text-xs">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-200">
              Home
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((segment, idx) => {
          const href = `/${segments.slice(0, idx + 1).join('/')}`
          const isLast = idx === segments.length - 1
          const formattedTitle =
            segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')

          return (
            <React.Fragment key={href}>
              <BreadcrumbSeparator className="text-zinc-600" />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="font-semibold text-zinc-200">
                    {formattedTitle}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href} className="text-zinc-400 hover:text-zinc-200">
                      {formattedTitle}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

// ==========================================
// Subcomponent: User Profile Dropdown
// ==========================================

interface UserProfileDropdownProps {
  user: UserProfile
  activeWorkspace: Workspace
}

function UserProfileDropdown({ user, activeWorkspace }: UserProfileDropdownProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    // Integrate with auth signout action
    router.push('/login')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 w-9 rounded-full border border-zinc-800 p-0 hover:bg-zinc-800 focus:ring-2 focus:ring-indigo-500/30"
          aria-label="Open user menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback className="bg-zinc-800 text-xs font-semibold text-zinc-200">
              {user.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 border-zinc-800 bg-zinc-900 text-zinc-100 shadow-xl"
      >
        <DropdownMenuLabel className="font-normal p-3">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold text-zinc-100">{user.name}</p>
            <p className="text-xs text-zinc-400 truncate">{user.email}</p>
            <div className="pt-1 flex items-center gap-1.5">
              <Badge
                variant="outline"
                className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-[10px]"
              >
                {activeWorkspace.name}
              </Badge>
              <span className="text-[10px] text-zinc-500">• {user.role}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => router.push('/dashboard/profile')}
            className="hover:bg-zinc-800 cursor-pointer text-xs text-zinc-300"
          >
            <User className="mr-2 h-4 w-4 text-zinc-400" />
            <span>Profile Details</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push('/dashboard/billing')}
            className="hover:bg-zinc-800 cursor-pointer text-xs text-zinc-300"
          >
            <Sparkles className="mr-2 h-4 w-4 text-amber-400" />
            <span>Subscription & Plan</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push('/dashboard/settings')}
            className="hover:bg-zinc-800 cursor-pointer text-xs text-zinc-300"
          >
            <Settings className="mr-2 h-4 w-4 text-zinc-400" />
            <span>Account Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="hover:bg-rose-500/10 cursor-pointer text-xs text-rose-400 font-medium focus:text-rose-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```
