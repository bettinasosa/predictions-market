"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from "react"
import PartisiaSdk from "partisia-sdk"

type WalletState = {
  isConnected: boolean
  address: string | null
  error: string | null
}

type WalletContextType = {
  state: WalletState
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  signAndSendTransaction: (transaction: any) => Promise<string>
}

const WalletContext = createContext<WalletContextType | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [sdk] = useState(() => new PartisiaSdk())
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    error: null
  })

  useEffect(() => {
    // Check if wallet is already connected
    if (sdk.isConnected) {
      setState({
        isConnected: true,
        address: sdk.connection!.account.address,
        error: null
      })
    }
  }, [sdk])

  const connect = async () => {
    try {
      await sdk.connect({
        permissions: ["sign"],
        dappName: "ProphetX",
        chainId: "Partisia Blockchain"
      })

      setState({
        isConnected: true,
        address: sdk.connection!.account.address,
        error: null
      })
    } catch (error) {
      setState({
        isConnected: false,
        address: null,
        error:
          error instanceof Error ? error.message : "Failed to connect wallet"
      })
    }
  }

  const disconnect = async () => {
    try {
      await sdk.disconnect()
      setState({
        isConnected: false,
        address: null,
        error: null
      })
    } catch (error) {
      setState({
        isConnected: false,
        address: null,
        error:
          error instanceof Error ? error.message : "Failed to disconnect wallet"
      })
    }
  }

  const signAndSendTransaction = async (transaction: any) => {
    try {
      const result = await sdk.signMessage({
        contract: transaction.contract,
        payload: transaction.payload,
        payloadType: "hex_payload"
      })
      return result.trxHash
    } catch (error) {
      setState(prev => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to sign transaction"
      }))
      throw error
    }
  }

  return (
    <WalletContext.Provider
      value={{ state, connect, disconnect, signAndSendTransaction }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}
