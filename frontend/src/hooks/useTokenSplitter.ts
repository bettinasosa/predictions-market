import { useCallback, useMemo } from "react"
import { useWallet } from "@/contexts/WalletContext"
import { TokenSplitterContract } from "@/contracts/token_splitter"
import {
  BlockchainTransactionClient,
  SenderAuthentication
} from "@partisiablockchain/blockchain-api-transaction-client"

interface TransactionMessage {
  contract: string
  payload: string
  payloadType: "hex_payload"
}

class WalletSenderAuthentication implements SenderAuthentication {
  constructor(
    private readonly signMessage: (
      message: TransactionMessage
    ) => Promise<string>,
    private readonly address: string
  ) {}

  async sign(message: Buffer): Promise<string> {
    const transaction: TransactionMessage = {
      contract: this.address,
      payload: message.toString("hex"),
      payloadType: "hex_payload"
    }
    return this.signMessage(transaction)
  }

  getAddress(): string {
    return this.address
  }
}

export function useTokenSplitter(contractAddress?: string) {
  const { state, signAndSendTransaction } = useWallet()

  const client = useMemo(() => {
    if (!state.isConnected) {
      console.error("Wallet is not connected")
      return null
    }
    if (!state.address) {
      console.error("No wallet address available")
      return null
    }

    try {
      const auth = new WalletSenderAuthentication(
        signAndSendTransaction,
        state.address
      )
      return BlockchainTransactionClient.create(
        "https://node1.testnet.partisiablockchain.com",
        auth
      )
    } catch (error) {
      console.error("Failed to create blockchain client:", error)
      return null
    }
  }, [state.isConnected, state.address, signAndSendTransaction])

  const contract = useMemo(() => {
    if (!client || !contractAddress) return null

    try {
      return new TokenSplitterContract(client, contractAddress)
    } catch (error) {
      console.error("Failed to create contract instance:", error)
      return null
    }
  }, [client, contractAddress])

  const initialize = useCallback(
    async (
      description: string,
      symbol: string,
      originalTokenAddress: string,
      trueTokenAddress: string,
      falseTokenAddress: string,
      arbitratorAddress: string
    ) => {
      if (!client) throw new Error("Blockchain client not initialized")
      if (!state.address) throw new Error("Wallet not connected")

      try {
        // Create a new contract instance with the sender's address
        const newContract = new TokenSplitterContract(client, state.address)

        // Initialize the contract with the provided parameters
        const transaction = await newContract.initialize(
          description,
          symbol,
          originalTokenAddress,
          trueTokenAddress,
          falseTokenAddress,
          arbitratorAddress
        )

        // Add gas configuration to the transaction
        transaction.gasLimit = BigInt(20_000_000)

        const result = await client.send(transaction)
        return result.toString()
      } catch (error) {
        console.error("Failed to initialize market:", error)
        throw error
      }
    },
    [client, state.address]
  )

  const deposit = useCallback(
    async (tokenAddress: string, amount: bigint) => {
      if (!contract) throw new Error("Contract not initialized")
      return contract.deposit(tokenAddress, amount)
    },
    [contract]
  )

  const withdraw = useCallback(
    async (tokenAddress: string, amount: bigint, waitForCallback: boolean) => {
      if (!contract) throw new Error("Contract not initialized")
      return contract.withdraw(tokenAddress, amount, waitForCallback)
    },
    [contract]
  )

  const prepare = useCallback(
    async (amount: bigint) => {
      if (!contract) throw new Error("Contract not initialized")
      return contract.prepare(amount)
    },
    [contract]
  )

  const split = useCallback(
    async (amount: bigint) => {
      if (!contract) throw new Error("Contract not initialized")
      return contract.split(amount)
    },
    [contract]
  )

  const join = useCallback(
    async (amount: bigint) => {
      if (!contract) throw new Error("Contract not initialized")
      return contract.join(amount)
    },
    [contract]
  )

  const settle = useCallback(
    async (outcome: boolean) => {
      if (!contract) throw new Error("Contract not initialized")
      return contract.settle(outcome)
    },
    [contract]
  )

  const redeem = useCallback(
    async (amount: bigint) => {
      if (!contract) throw new Error("Contract not initialized")
      return contract.redeem(amount)
    },
    [contract]
  )

  return {
    isConnected: state.isConnected,
    address: state.address,
    initialize,
    deposit,
    withdraw,
    prepare,
    split,
    join,
    settle,
    redeem
  }
}
