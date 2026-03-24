import { CalendarDays } from 'lucide-react'

export default function PlaneamentoPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-forest-100 mb-5">
        <CalendarDays className="h-8 w-8 text-forest-500" />
      </div>
      <h1 className="text-2xl font-bold text-cream-800 mb-2">Planeamento</h1>
      <p className="text-cream-500 text-sm">Em breve...</p>
    </div>
  )
}
