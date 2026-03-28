'use client'

import Image from 'next/image'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Zap,
  Sun,
  Droplets,
  Receipt,
  CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const mainNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/solar', label: 'Solar', icon: Sun },
  { href: '/rega', label: 'Rega', icon: Droplets },
  { href: '/financeiro', label: 'Financeiro', icon: Receipt },
  { href: '/planeamento', label: 'Planeamento', icon: CalendarDays },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside className="hidden md:flex h-screen w-56 flex-col bg-forest-900 flex-shrink-0">

      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 px-5 py-5 border-b border-forest-800 hover:bg-forest-800/50 transition-colors group">
        <div className="flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 duration-200">
          <Image src="/logo.png" alt="Quinta da Cholda" width={32} height={32} className="object-contain" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-forest-100 leading-tight">Quinta da Cholda</span>
          <span className="text-[10px] text-forest-300 font-medium tracking-wider uppercase leading-tight mt-0.5">
            Gestão de Energia
          </span>
        </div>
      </Link>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {mainNavItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
              isActive(href)
                ? 'bg-forest-700 text-white'
                : 'text-forest-300 hover:bg-forest-800 hover:text-forest-100'
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 pb-4 border-t border-forest-800 pt-3 space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
            isActive('/settings')
              ? 'bg-forest-700 text-white'
              : 'text-forest-300 hover:bg-forest-800 hover:text-forest-100'
          )}
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          Configurações
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-forest-300 hover:bg-forest-800 hover:text-forest-100 transition-all duration-150"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  )
}
