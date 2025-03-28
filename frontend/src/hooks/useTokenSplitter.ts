import { useMemo, useCallback } from "react"
import { useMetaMaskWallet } from "./useWallet"
import { TokenSplitterContract } from "@/contracts/token_splitter"
import {
  BlockchainTransactionClient,
  SenderAuthentication
} from "@partisiablockchain/blockchain-api-transaction-client"

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
        // Create a temporary contract instance for deployment
        const tempContract = new TokenSplitterContract(client, "")

        // Deploy the contract
        const deployResult = await tempContract.initialize(
          description,
          symbol,
          originalTokenAddress,
          trueTokenAddress,
          falseTokenAddress,
          arbitratorAddress
        )

        // Wait for deployment confirmation
        const deployedAddress = await new Promise<string>((resolve, reject) => {
          const checkInterval = setInterval(async () => {
            try {
              // Check if the transaction is verified
              const response = await fetch(
                `https://node1.testnet.partisiablockchain.com/chain/shards/Shard0/transactions/${deployResult.toString()}`
              )
              const data = await response.json()

              if (data?.executionStatus?.success === true) {
                clearInterval(checkInterval)
                resolve(deployResult.toString())
              }
            } catch {
              // Transaction might not be ready yet, continue checking
            }
          }, 2000) // Check every 2 seconds

          // Timeout after 30 seconds
          setTimeout(() => {
            clearInterval(checkInterval)
            reject(new Error("Contract deployment timeout"))
          }, 30000)
        })

        return deployedAddress
      } catch (error) {
        console.error("Failed to deploy contract:", error)
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
