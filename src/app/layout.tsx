import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cholda Energy',
  description: 'Dashboard de produção solar e consumo de bombas',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 font-sans">{children}</body>
    </html>
  )
}
