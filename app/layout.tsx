// app/layout.tsx
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Metadata } from 'next'

import { WalletProvider } from './WalletProvider'

export const metadata: Metadata = {
  title: 'Agent Dashboard',
  description: 'A platform for viewing and creating agents',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
      <WalletProvider>
        <Header />
        <main style={{ minHeight: '80vh' }}>
          {children}
        </main>
        <Footer />
        </WalletProvider>
      </body>
    </html>
  )
}
