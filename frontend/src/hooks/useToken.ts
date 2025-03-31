import { useMemo, useCallback } from "react"
import { useMetaMaskWallet } from "./useWallet"
import {
  BlockchainTransactionClient,
  SenderAuthentication
} from "@partisiablockchain/blockchain-api-transaction-client"
import { TokenContract } from "@/contracts/token"

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

export interface TokenMethods {
  deploy: (
    name: string,
    symbol: string,
    decimals: number,
    supply: bigint
  ) => Promise<string>
  approve: (spender: string, amount: bigint) => Promise<string>
  deposit: (tokenAddress: string, amount: bigint) => Promise<string>
}

export function useToken(): {
  client: BlockchainTransactionClient | null
  connected: boolean
  address: string
} & TokenMethods {
  const { connected, address, signMessage, connect } = useMetaMaskWallet()

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

  const deploy = useCallback(
    async (name: string, symbol: string, decimals: number, supply: bigint) => {
      if (!connected) {
        await connect()
      }

      if (!client) {
        throw new Error("Blockchain client not initialized")
      }

      try {
        console.log("Starting token deployment with parameters:", {
          name,
          symbol,
          decimals,
          supply: supply.toString()
        })

        // Create a temporary contract instance for deployment
        const tempContract = new TokenContract(client, "")

        // Deploy the contract
        const deployResult = await tempContract.initialize(
          name,
          symbol,
          decimals,
          supply
        )

        console.log(
          "Token deployment transaction sent:",
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
            reject(new Error("Token deployment timeout"))
          }, 30000)
        })

        console.log("Token successfully deployed at:", deployedAddress)
        return deployedAddress
      } catch (error) {
        console.error("Failed to deploy token:", error)
        if (error instanceof Error) {
          throw new Error(`Failed to deploy token: ${error.message}`)
        }
        throw new Error("Failed to deploy token. Please try again.")
      }
    },
    [connected, connect, client]
  )

  const approve = useCallback(
    async (spender: string, amount: bigint) => {
      if (!connected) {
        await connect()
      }

      if (!client) {
        throw new Error("Blockchain client not initialized")
      }

      try {
        console.log("Starting token approval:", {
          spender,
          amount: amount.toString()
        })

        // Create a temporary contract instance for approval
        const tempContract = new TokenContract(client, "")

        // Approve the spender
        const approveResult = await tempContract.approve(spender, amount)

        console.log(
          "Token approval transaction sent:",
          approveResult.toString()
        )

        // Wait for approval confirmation
        const approved = await new Promise<string>((resolve, reject) => {
          const checkInterval = setInterval(async () => {
            try {
              // Check all shards for the transaction
              const shards = [0, 1, 2]
              for (const shard of shards) {
                const response = await fetch(
                  `https://node1.testnet.partisiablockchain.com/chain/shards/Shard${shard}/transactions/${approveResult.toString()}`
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
                  resolve(approveResult.toString())
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
            reject(new Error("Token approval timeout"))
          }, 30000)
        })

        console.log("Token approval successful:", approved)
        return approved
      } catch (error) {
        console.error("Failed to approve token:", error)
        if (error instanceof Error) {
          throw new Error(`Failed to approve token: ${error.message}`)
        }
        throw new Error("Failed to approve token. Please try again.")
      }
    },
    [connected, connect, client]
  )

  const deposit = useCallback(
    async (tokenAddress: string, amount: bigint) => {
      if (!connected) {
        await connect()
      }

      if (!client) {
        throw new Error("Blockchain client not initialized")
      }

      try {
        console.log("Starting token deposit:", {
          tokenAddress,
          amount: amount.toString()
        })

        // Create a temporary contract instance for deposit
        const tempContract = new TokenContract(client, tokenAddress)

        // Deposit the tokens
        const depositResult = await tempContract.deposit(amount)

        console.log("Token deposit transaction sent:", depositResult.toString())

        // Wait for deposit confirmation
        const deposited = await new Promise<string>((resolve, reject) => {
          const checkInterval = setInterval(async () => {
            try {
              // Check all shards for the transaction
              const shards = [0, 1, 2]
              for (const shard of shards) {
                const response = await fetch(
                  `https://node1.testnet.partisiablockchain.com/chain/shards/Shard${shard}/transactions/${depositResult.toString()}`
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
                  resolve(depositResult.toString())
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
            reject(new Error("Token deposit timeout"))
          }, 30000)
        })

        console.log("Token deposit successful:", deposited)
        return deposited
      } catch (error) {
        console.error("Failed to deposit token:", error)
        if (error instanceof Error) {
          throw new Error(`Failed to deposit token: ${error.message}`)
        }
        throw new Error("Failed to deposit token. Please try again.")
      }
    },
    [connected, connect, client]
  )

  return {
    client,
    connected,
    address,
    deploy,
    approve,
    deposit
  }
}
