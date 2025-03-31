import { useMemo, useCallback } from "react"
import { TokenSplitterContract } from "@/contracts/token_splitter"
import {
  BlockchainTransactionClient,
  SenderAuthentication
} from "@partisiablockchain/blockchain-api-transaction-client"
import { useWallet } from "@/contexts/WalletContext"

class WalletSenderAuthentication implements SenderAuthentication {
  constructor(
    private readonly signMessage: (message: string) => Promise<unknown>,
    private readonly address: string
  ) {}

  async sign(transactionPayload: Buffer): Promise<string> {
    const message = transactionPayload.toString("hex")
    const signature = await this.signMessage(message)
    return signature as string
  }

  getAddress(): string {
    return this.address
  }
}

export interface TokenSplitterMethods {
  deposit: (tokenAddress: string, amount: bigint) => Promise<string>
  withdraw: (
    tokenAddress: string,
    amount: bigint,
    isTrue: boolean
  ) => Promise<string>
  initialize: (
    description: string,
    symbol: string,
    originalTokenAddress: string,
    trueTokenAddress: string,
    falseTokenAddress: string,
    arbitratorAddress: string
  ) => Promise<string>
}

export function useTokenSplitter(contractAddress?: string): {
  contract: TokenSplitterContract | null
  client: BlockchainTransactionClient | null
  connected: boolean
  address: string
} & TokenSplitterMethods {
  const { connected, address, signMessage, connect } = useWallet()

  const client = useMemo(() => {
    if (!connected || !address) {
      return null
    }

    return BlockchainTransactionClient.create(
      "https://node1.testnet.partisiablockchain.com",
      new WalletSenderAuthentication(signMessage, address),
      0 // chainId for testnet
    )
  }, [connected, address, signMessage])

  const contract = useMemo(() => {
    if (!client || !contractAddress) return null
    return new TokenSplitterContract(client, contractAddress)
  }, [client, contractAddress])

  const deposit = useCallback(
    async (tokenAddress: string, amount: bigint) => {
      if (!connected) {
        await connect()
      }
      if (!contract) throw new Error("Contract not initialized")
      const result = await contract.deposit(tokenAddress, amount)
      return result.toString()
    },
    [contract, connected, connect]
  )

  const withdraw = useCallback(
    async (tokenAddress: string, amount: bigint, isTrue: boolean) => {
      if (!connected) {
        await connect()
      }
      if (!contract) throw new Error("Contract not initialized")
      const result = await contract.withdraw(tokenAddress, amount, isTrue)
      return result.toString()
    },
    [contract, connected, connect]
  )

  const initialize = useCallback(
    async (
      description: string,
      symbol: string,
      originalTokenAddress: string,
      trueTokenAddress: string,
      falseTokenAddress: string,
      arbitratorAddress: string
    ) => {
      if (!connected) {
        await connect()
      }

      if (!client) {
        throw new Error("Blockchain client not initialized")
      }

      try {
        console.log("Starting contract deployment with parameters:", {
          description,
          symbol,
          originalTokenAddress,
          trueTokenAddress,
          falseTokenAddress,
          arbitratorAddress
        })

        // Create a temporary contract instance for deployment
        const tempContract = new TokenSplitterContract(client, "")

        // Deploy the contract with retries
        let deployResult
        let retryCount = 0
        const maxRetries = 3

        while (retryCount < maxRetries) {
          try {
            deployResult = await tempContract.initialize(
              description,
              symbol,
              originalTokenAddress,
              trueTokenAddress,
              falseTokenAddress,
              arbitratorAddress
            )
            break
          } catch (error) {
            console.error(`Deployment attempt ${retryCount + 1} failed:`, error)
            retryCount++
            if (retryCount === maxRetries) {
              throw error
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }

        if (!deployResult) {
          throw new Error("Failed to deploy contract after multiple attempts")
        }

        console.log(
          "Contract deployment transaction sent:",
          deployResult.toString()
        )

        // Wait for deployment confirmation
        const deployedAddress = await new Promise<string>((resolve, reject) => {
          const checkInterval = setInterval(async () => {
            try {
              // Check all shards for the transaction
              const shards = [0, 1, 2]
              for (const shard of shards) {
                const response = await fetch(
                  `https://node1.testnet.partisiablockchain.com/chain/shards/Shard${shard}/transactions/${deployResult.toString()}`
                )

                if (!response.ok) {
                  console.error(
                    `Transaction check failed for shard ${shard}:`,
                    response.status,
                    response.statusText
                  )
                  continue
                }

                const data = await response.json()
                console.log(
                  `Transaction status check for shard ${shard}:`,
                  data
                )

                if (data?.executionStatus?.success === true) {
                  clearInterval(checkInterval)
                  resolve(deployResult.toString())
                  return
                } else if (data?.executionStatus?.success === false) {
                  clearInterval(checkInterval)
                  reject(
                    new Error(
                      `Transaction failed: ${data.executionStatus.error || "Unknown error"}`
                    )
                  )
                  return
                }
              }
            } catch (error) {
              console.error("Error checking transaction status:", error)
              // Transaction might not be ready yet, continue checking
            }
          }, 2000) // Check every 2 seconds

          // Timeout after 30 seconds
          setTimeout(() => {
            clearInterval(checkInterval)
            reject(new Error("Contract deployment timeout"))
          }, 30000)
        })

        console.log("Contract successfully deployed at:", deployedAddress)

        // Wait a bit for the contract to be fully registered
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Prepare the contract with retries
        let prepareResult
        retryCount = 0

        while (retryCount < maxRetries) {
          try {
            prepareResult = await tempContract.prepare(BigInt(0))
            break
          } catch (error) {
            console.error(
              `Preparation attempt ${retryCount + 1} failed:`,
              error
            )
            retryCount++
            if (retryCount === maxRetries) {
              throw error
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }

        if (!prepareResult) {
          throw new Error("Failed to prepare contract after multiple attempts")
        }

        console.log(
          "Contract preparation transaction sent:",
          prepareResult.toString()
        )

        // Wait for preparation confirmation
        await new Promise<string>((resolve, reject) => {
          const checkInterval = setInterval(async () => {
            try {
              // Check all shards for the transaction
              const shards = [0, 1, 2]
              for (const shard of shards) {
                const response = await fetch(
                  `https://node1.testnet.partisiablockchain.com/chain/shards/Shard${shard}/transactions/${prepareResult.toString()}`
                )

                if (!response.ok) {
                  console.error(
                    `Transaction check failed for shard ${shard}:`,
                    response.status,
                    response.statusText
                  )
                  continue
                }

                const data = await response.json()
                console.log(
                  `Transaction status check for shard ${shard}:`,
                  data
                )

                if (data?.executionStatus?.success === true) {
                  clearInterval(checkInterval)
                  resolve(prepareResult.toString())
                  return
                } else if (data?.executionStatus?.success === false) {
                  clearInterval(checkInterval)
                  reject(
                    new Error(
                      `Transaction failed: ${data.executionStatus.error || "Unknown error"}`
                    )
                  )
                  return
                }
              }
            } catch (error) {
              console.error("Error checking transaction status:", error)
              // Transaction might not be ready yet, continue checking
            }
          }, 2000) // Check every 2 seconds

          // Timeout after 30 seconds
          setTimeout(() => {
            clearInterval(checkInterval)
            reject(new Error("Contract preparation timeout"))
          }, 30000)
        })

        console.log("Contract successfully prepared")
        return deployedAddress
      } catch (error) {
        console.error("Failed to deploy contract:", error)
        if (error instanceof Error) {
          throw new Error(`Failed to deploy contract: ${error.message}`)
        }
        throw new Error("Failed to deploy contract. Please try again.")
      }
    },
    [connected, connect, client]
  )

  return {
    contract,
    client,
    connected,
    address,
    deposit,
    withdraw,
    initialize
  }
}
