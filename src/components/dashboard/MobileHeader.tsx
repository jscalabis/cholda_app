'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Sun, 
  Droplets, 
  Receipt, 
  CalendarDays, 
  Settings, 
  LogOut 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const mainNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/solar', label: 'Solar', icon: Sun },
  { href: '/rega', label: 'Rega', icon: Droplets },
  { href: '/financeiro', label: 'Financeiro', icon: Receipt },
  { href: '/planeamento', label: 'Planeamento', icon: CalendarDays },
]

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    setIsOpen(false)
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <header className="md:hidden bg-forest-900 border-b border-forest-800 sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
          <Image src="/logo.png" alt="Quinta da Cholda" width={28} height={28} className="object-contain" />
          <div className="flex flex-col gap-0">
            <span className="font-semibold text-xs text-forest-100 leading-tight">Quinta da Cholda</span>
            <span className="text-[8px] text-forest-400 font-medium tracking-wider uppercase leading-tight">Gestão Energia</span>
          </div>
        </Link>
        
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 text-forest-300 hover:text-forest-100 hover:bg-forest-800 rounded-lg transition-colors"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Slide down menu */}
      {isOpen && (
        <div className="bg-forest-900 border-t border-forest-800 shadow-2xl animate-in slide-in-from-top-4 duration-200">
          <nav className="px-3 py-3 space-y-1">
            {mainNavItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all',
                  isActive(href)
                    ? 'bg-forest-700 text-white'
                    : 'text-forest-300 hover:bg-forest-800 hover:text-forest-100'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </Link>
            ))}
            
            <div className="pt-2 mt-2 border-t border-forest-800 flex flex-col gap-1">
                <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all',
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
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-forest-300 hover:bg-forest-800 hover:text-forest-100 transition-all"
                >
                <LogOut className="h-4 w-4 flex-shrink-0" />
                Sair
                </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
