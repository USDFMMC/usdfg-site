import '@/lib/firebase/config'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import '@solana/wallet-adapter-react-ui/styles.css'
import './index.css'
import App from './App.tsx'
import SolanaWalletProvider from './providers/SolanaWalletProvider.tsx'
import { queryClient } from './lib/queryClient'
import { Toaster } from '@/components/ui/toaster'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SolanaWalletProvider>
        <BrowserRouter>
          <App />
          <Toaster />
        </BrowserRouter>
      </SolanaWalletProvider>
    </QueryClientProvider>
  </StrictMode>,
)
