import '@/lib/firebase/config'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import '@solana/wallet-adapter-react-ui/styles.css'
import './index.css'
import App from './App.tsx'
import SolanaWalletProvider from './providers/SolanaWalletProvider.tsx'
import { queryClient } from './lib/queryClient'
import { Toaster } from '@/components/ui/toaster'
import BindWalletIdentity from '@/components/BindWalletIdentity'
import UpdateBanner from '@/components/ui/UpdateBanner'
import { startVersionMonitoring } from '@/lib/version'

function AppShell() {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)

  useEffect(() => {
    const stopMonitoring = startVersionMonitoring(() => setShowUpdateBanner(true))
    return () => stopMonitoring()
  }, [])

  return (
    <>
      {showUpdateBanner && (
        <UpdateBanner onDismiss={() => setShowUpdateBanner(false)} />
      )}
      <BindWalletIdentity />
      <App />
      <Toaster />
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SolanaWalletProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </SolanaWalletProvider>
    </QueryClientProvider>
  </StrictMode>,
)
