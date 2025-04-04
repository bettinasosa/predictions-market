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
          // Use a shorter validity window and current timestamp
          const now = Math.floor(Date.now() / 1000) * 1000 // Round to nearest second

          // Format transaction payload according to Partisia spec
          const txPayload = {
            nonce: now.toString(),
            validTo: String(now + 30000), // 30 seconds validity
            gasCost: String(cost),
            address: payload.contractAddress,
            rpc: payload.rpc
          }

          console.log("Sending transaction with payload:", {
            ...txPayload,
            rpc: "0x" + payload.rpc.toString("hex").slice(0, 20) + "..." // Truncate RPC for logging
          })

          // Use signMessage with the correct payload format
          const result = await sdk.signMessage({
            payload: Buffer.from(JSON.stringify(txPayload)).toString("hex"),
            payloadType: "hex",
            dontBroadcast: false
          })

          if (!result.trxHash) {
            throw new Error("No transaction hash returned")
          }

          // Wait for transaction to be confirmed across all shards
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Transaction confirmation timeout"))
            }, 30000) // 30 second timeout

            const checkConfirmation = async () => {
              try {
                // Check all shards for the transaction
                const shards = [0, 1, 2]
                let successCount = 0
                let errorCount = 0

                for (const shard of shards) {
                  try {
                    const response = await fetch(
                      `https://node1.testnet.partisiablockchain.com/chain/shards/Shard${shard}/transactions/${result.trxHash}`
                    )

                    if (!response.ok) {
                      console.error(
                        `Transaction check failed for shard ${shard}:`,
                        response.status,
                        response.statusText
                      )
                      errorCount++
                      continue
                    }

                    const data = await response.json()
                    console.log(
                      `Transaction status check for shard ${shard}:`,
                      data
                    )

                    if (data?.executionStatus?.success === true) {
                      successCount++
                      if (successCount >= 2) {
                        // Require at least 2 shards to confirm
                        clearTimeout(timeout)
                        resolve()
                        return
                      }
                    } else if (data?.executionStatus?.success === false) {
                      errorCount++
                      if (errorCount >= 2) {
                        // If 2 shards report failure
                        clearTimeout(timeout)
                        reject(
                          new Error(
                            `Transaction failed: ${data.executionStatus.error || "Unknown error"}`
                          )
                        )
                        return
                      }
                    }
                  } catch (error) {
                    console.error(`Error checking shard ${shard}:`, error)
                    errorCount++
                  }
                }

                // If we get here, transaction is still pending
                setTimeout(checkConfirmation, 2000) // Check every 2 seconds
              } catch (error) {
                console.error("Error checking transaction status:", error)
                // Transaction might not be ready yet, continue checking
                setTimeout(checkConfirmation, 2000)
              }
            }

            checkConfirmation()
          })

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

          // Wait before retrying (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
          await new Promise(resolve => setTimeout(resolve, delay))
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
