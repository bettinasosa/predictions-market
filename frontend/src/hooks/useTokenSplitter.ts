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
  const { connected, address, signMessage } = useMetaMaskWallet()

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
      if (!contract) throw new Error("Contract not initialized")
      const result = await contract.deposit(tokenAddress, amount)
      return result.toString()
    },
    [contract]
  )

  const withdraw = useCallback(
    async (tokenAddress: string, amount: bigint, isTrue: boolean) => {
      if (!contract) throw new Error("Contract not initialized")
      const result = await contract.withdraw(tokenAddress, amount, isTrue)
      return result.toString()
    },
    [contract]
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
      if (!connected) throw new Error("Wallet not connected")

      // Open the Partisia Blockchain Browser in a new tab for contract deployment
      const params = new URLSearchParams({
        description,
        symbol,
        originalToken: originalTokenAddress,
        trueToken: trueTokenAddress,
        falseToken: falseTokenAddress,
        arbitrator: arbitratorAddress
      })
      const deployUrl = `https://browser.testnet.partisiablockchain.com/contracts/deploy?${params.toString()}`
      window.open(deployUrl, "_blank")

      // Return a message indicating manual deployment is required
      return "Please deploy the contract using the Partisia Blockchain Browser. Once deployed, use the contract address to interact with it."
    },
    [connected]
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
