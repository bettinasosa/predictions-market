"use client"

import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useState
} from "react"
import PartisiaSdk from "partisia-sdk"
import {
  BlockchainTransactionClient,
  SenderAuthentication
} from "@partisiablockchain/blockchain-api-transaction-client"
import type { PermissionTypes } from "partisia-sdk/dist/sdk-listeners"

interface WalletState {
  connected: boolean
  address: string
  error: string | null
  isInitialized: boolean
  isConnecting: boolean
}

interface WalletContextType {
  state: WalletState
  client: BlockchainTransactionClient | null
  sdk: PartisiaSdk | null
  connect: () => Promise<void>
  disconnect: () => void
  signAndSendTransaction: (
    payload: { rpc: Buffer; contractAddress: string },
    cost?: number
  ) => Promise<{ transactionHash: string }>
}

const WalletContext = createContext<WalletContextType | null>(null)

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

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: "",
    error: null,
    isInitialized: false,
    isConnecting: false
  })
  const [sdk, setSdk] = useState<PartisiaSdk | null>(null)
  const [client, setClient] = useState<BlockchainTransactionClient | null>(null)

  const initializeClient = useCallback(
    async (partisiaSdk: PartisiaSdk, address: string) => {
      try {
        // Initialize blockchain client
        const blockchainClient = BlockchainTransactionClient.create(
          "https://node1.testnet.partisiablockchain.com",
          new PartisiaSenderAuthentication(partisiaSdk, address),
          0 // chainId for testnet
        )

        // Wait for client to be ready
        await new Promise<void>(resolve => {
          const checkClient = () => {
            if (blockchainClient) {
              resolve()
            } else {
              setTimeout(checkClient, 100)
            }
          }
          checkClient()
        })

        setClient(blockchainClient)
        setState(prev => ({ ...prev, isInitialized: true }))
        return blockchainClient
      } catch (error) {
        console.error("Error initializing blockchain client:", error)
        throw error
      }
    },
    []
  )

  const connect = useCallback(async () => {
    // Prevent multiple connection attempts
    if (state.isConnecting || (state.connected && sdk && client)) {
      return
    }

    try {
      setState(prev => ({ ...prev, isConnecting: true, error: null }))

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

      // Initialize blockchain client
      await initializeClient(partisiaSdk, connection.account.address)

      setState(prev => ({
        ...prev,
        connected: true,
        address: connection.account.address
      }))
    } catch (error: unknown) {
      console.error("Error connecting wallet:", error)
      setState(prev => ({
        ...prev,
        connected: false,
        address: "",
        isInitialized: false,
        error:
          error instanceof Error ? error.message : "Failed to connect wallet"
      }))
      setSdk(null)
      setClient(null)
      throw error
    } finally {
      setState(prev => ({ ...prev, isConnecting: false }))
    }
  }, [state.isConnecting, state.connected, sdk, client, initializeClient])

  const disconnect = useCallback(() => {
    if (sdk) {
      setState({
        connected: false,
        address: "",
        error: null,
        isInitialized: false,
        isConnecting: false
      })
      setSdk(null)
      setClient(null)
    }
  }, [sdk])

  const signAndSendTransaction = useCallback(
    async (
      payload: { rpc: Buffer; contractAddress: string },
      cost: number = 0
    ): Promise<{ transactionHash: string }> => {
      if (!sdk || !client || !state.connected || !state.isInitialized) {
        throw new Error("Wallet not connected or not fully initialized")
      }

      const maxRetries = 3
      let retryCount = 0

      while (retryCount < maxRetries) {
        try {
          // Format transaction payload according to Partisia spec
          const txPayload = {
            nonce: Date.now().toString(), // Fresh timestamp for each attempt
            validTo: String(new Date().getTime() + 300000), // 5 minute validity
            gasCost: String(cost),
            address: payload.contractAddress,
            rpc: payload.rpc
          }

          // Sign and send transaction
          const result = await sdk.signMessage({
            payload: Buffer.from(JSON.stringify(txPayload)).toString("hex"),
            payloadType: "hex",
            dontBroadcast: false
          })

          if (!result.trxHash) {
            throw new Error("No transaction hash returned")
          }

          return {
            transactionHash: result.trxHash
          }
        } catch (error: unknown) {
          console.error(`Transaction attempt ${retryCount + 1} failed:`, error)

          // Check if it's an expired error or other error
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          const isExpiredError = errorMessage.toLowerCase().includes("expired")

          retryCount++

          if (retryCount === maxRetries || !isExpiredError) {
            console.error("Max retries reached or non-expiry error:", error)
            throw error
          }

          // Wait before retrying (increasing delay for each retry)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
          console.log(`Retrying transaction (attempt ${retryCount + 1})...`)
        }
      }

      throw new Error("Failed to send transaction after multiple attempts")
    },
    [sdk, client, state.connected, state.isInitialized]
  )

  const value = {
    state,
    client,
    sdk,
    connect,
    disconnect,
    signAndSendTransaction
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
