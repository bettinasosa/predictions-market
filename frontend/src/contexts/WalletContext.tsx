"use client"

import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
  useState
} from "react"
import PartisiaSdk from "partisia-sdk"
import {
  BlockchainTransactionClient,
  SenderAuthentication
} from "@partisiablockchain/blockchain-api-transaction-client"
import type { PermissionTypes } from "partisia-sdk/dist/sdk-listeners"

class PartisiaSenderAuthentication implements SenderAuthentication {
  constructor(
    private readonly sdk: PartisiaSdk,
    private readonly address: string
  ) {}

  async sign(transactionPayload: Buffer): Promise<string> {
    const message = transactionPayload.toString("hex")
    const result = await this.sdk.signMessage({
      payload: message,
      payloadType: "hex"
    })
    return result.signature
  }

  getAddress(): string {
    return this.address
  }
}

interface WalletContextType {
  connected: boolean
  address: string
  error: string | null
  client: BlockchainTransactionClient | null
  sdk: PartisiaSdk | null
  connect: () => Promise<void>
  disconnect: () => void
  signMessage: (message: string) => Promise<string>
}

const WalletContext = createContext<WalletContextType | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sdk, setSdk] = useState<PartisiaSdk | null>(null)
  const [client, setClient] = useState<BlockchainTransactionClient | null>(null)

  const connect = useCallback(async () => {
    // Don't reconnect if already connected
    if (connected && sdk && client) {
      return
    }

    try {
      setError(null)

      // Initialize Partisia SDK
      const partisiaSdk = new PartisiaSdk()
      setSdk(partisiaSdk)

      // Connect to wallet
      await partisiaSdk.connect({
        permissions: ["sign"] as PermissionTypes[],
        dappName: "Predictions Market",
        chainId: "Partisia Blockchain Testnet"
      })

      // Get account address
      const connection = partisiaSdk.connection
      if (!connection?.account?.address) {
        throw new Error("Failed to get account address")
      }

      setAddress(connection.account.address)

      // Initialize blockchain client
      const blockchainClient = BlockchainTransactionClient.create(
        "https://node1.testnet.partisiablockchain.com",
        new PartisiaSenderAuthentication(
          partisiaSdk,
          connection.account.address
        ),
        0 // chainId for testnet
      )
      setClient(blockchainClient)

      setConnected(true)
    } catch (error: unknown) {
      console.error("Error connecting wallet:", error)
      setError(
        error instanceof Error ? error.message : "Failed to connect wallet"
      )
      setConnected(false)
      setAddress("")
      setSdk(null)
      setClient(null)
      throw error
    }
  }, [connected, sdk, client])

  const disconnect = useCallback(() => {
    if (sdk) {
      setConnected(false)
      setAddress("")
      setError(null)
      setSdk(null)
      setClient(null)
    }
  }, [sdk])

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!sdk) {
        throw new Error("Wallet not connected")
      }

      try {
        const result = await sdk.signMessage({
          payload: message,
          payloadType: "utf8"
        })
        return result.signature
      } catch (error: unknown) {
        console.error("Error signing message:", error)
        throw new Error("Failed to sign message")
      }
    },
    [sdk]
  )

  // Initialize connection on mount
  useEffect(() => {
    // Only try to connect if not already connected
    if (!connected) {
      connect().catch((error: unknown) => {
        console.error("Failed to initialize wallet connection:", error)
      })
    }
  }, [connect, connected])

  const value = {
    connected,
    address,
    error,
    client,
    sdk,
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
