"use client"

import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"

const PARTISIA_SNAP_ID = "npm:@partisiablockchain/snap"

interface SnapConfig {
  version?: string
}

type RequestParams =
  | { method: "eth_requestAccounts" }
  | { method: "wallet_requestSnaps"; params: { [key: string]: SnapConfig } }
  | {
      method: "wallet_invokeSnap"
      params: {
        snapId: string
        request: {
          method: "get_address" | "sign_transaction"
          params?: {
            payload: string
            chainId: string
          }
        }
      }
    }

interface EthereumProvider {
  request: <T extends RequestParams>(args: T) => Promise<unknown>
  on(event: "accountsChanged", callback: (accounts: string[]) => void): void
  on(event: "chainChanged", callback: () => void): void
  removeListener(
    event: "accountsChanged",
    callback: (accounts: string[]) => void
  ): void
  removeListener(event: "chainChanged", callback: () => void): void
}

declare global {
  interface Window {
    ethereum: EthereumProvider
  }
}

interface SnapResult {
  [key: string]: {
    enabled: boolean
    permission?: string[]
  }
}

export function useMetaMaskWallet() {
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState("")
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed")
      }

      // Request account access
      await window.ethereum.request({
        method: "eth_requestAccounts"
      })

      // Install Partisia Snap
      const snapResult = (await window.ethereum.request({
        method: "wallet_requestSnaps",
        params: {
          [PARTISIA_SNAP_ID]: {}
        }
      })) as SnapResult

      if (!snapResult || !(PARTISIA_SNAP_ID in snapResult)) {
        throw new Error("Failed to install Partisia snap")
      }

      // Get Partisia address
      const partisiaAddress = await window.ethereum.request({
        method: "wallet_invokeSnap",
        params: {
          snapId: PARTISIA_SNAP_ID,
          request: {
            method: "get_address"
          }
        }
      })

      if (typeof partisiaAddress === "string") {
        setConnected(true)
        setAddress(partisiaAddress)
        setError(null)
        toast.success("Connected to Partisia Blockchain")
      } else {
        throw new Error("Failed to get Partisia address")
      }
    } catch (err) {
      const error = err as Error
      setError(error.message)
      toast.error(error.message)
      setConnected(false)
      setAddress("")
    }
  }, [])

  const disconnect = useCallback(() => {
    setConnected(false)
    setAddress("")
    setError(null)
  }, [])

  const signMessage = useCallback(
    async (message: string) => {
      if (!connected) throw new Error("Wallet not connected")
      if (!window.ethereum) throw new Error("MetaMask is not installed")

      try {
        return await window.ethereum.request({
          method: "wallet_invokeSnap",
          params: {
            snapId: PARTISIA_SNAP_ID,
            request: {
              method: "sign_transaction",
              params: {
                payload: message,
                chainId: "testnet"
              }
            }
          }
        })
      } catch (err) {
        const error = err as Error
        setError(error.message)
        throw error
      }
    },
    [connected]
  )

  // Initialize connection on mount
  useEffect(() => {
    connect()
  }, [connect])

  return { connected, address, error, connect, disconnect, signMessage }
}
