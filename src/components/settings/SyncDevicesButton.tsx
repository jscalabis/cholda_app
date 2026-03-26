'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SyncDevicesButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    message: string
    new_devices?: string[]
    total_devices?: number
  } | null>(null)
  const router = useRouter()

  async function handleSync() {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/sync-devices', { method: 'POST' })
      const data = await res.json()
      setResult(data)

      // Refresh the page to show updated data
      router.refresh()
    } catch {
      setResult({ message: 'Erro de ligação ao servidor.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={loading}
        className="gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'A sincronizar...' : 'Sincronizar dispositivos'}
      </Button>
      {result && (
        <span className={`text-xs ${
          result.new_devices?.length ? 'text-green-600 font-medium' : 'text-cream-500'
        }`}>
          {result.message}
        </span>
      )}
    </div>
  )
}
