"use client"

import { createContext, useContext, ReactNode } from "react"
import { useMetaMaskWallet } from "@/hooks/useWallet"

interface WalletState {
  connected: boolean
  address: string
  error: string | null
}

interface WalletContextType {
  state: WalletState
  connect: () => Promise<void>
  disconnect: () => void
  signMessage: (message: string) => Promise<unknown>
}

const WalletContext = createContext<WalletContextType | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const { connected, address, error, connect, disconnect, signMessage } =
    useMetaMaskWallet()

  const value = {
    state: {
      connected,
      address,
      error
    },
    connect,
    disconnect,
    signMessage
  }

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}
