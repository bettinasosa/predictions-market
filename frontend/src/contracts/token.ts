import { BlockchainTransactionClient } from "@partisiablockchain/blockchain-api-transaction-client"

export type Address = string

const GAS_LIMIT = 20000

export class TokenContract {
  constructor(
    private readonly client: BlockchainTransactionClient,
    private readonly address: string
  ) {}

  initialize(name: string, symbol: string, decimals: number, supply: bigint) {
    const payload = Buffer.from(
      JSON.stringify({
        type: "initialize",
        name,
        symbol,
        decimals,
        supply: supply.toString()
      })
    )
    return this.client.signAndSend(
      { address: this.address, rpc: payload },
      GAS_LIMIT
    )
  }

  approve(spender: Address, amount: bigint) {
    const payload = Buffer.from(
      JSON.stringify({
        type: "approve",
        spender,
        amount: amount.toString()
      })
    )
    return this.client.signAndSend(
      { address: this.address, rpc: payload },
      GAS_LIMIT
    )
  }

  deposit(amount: bigint) {
    const payload = Buffer.from(
      JSON.stringify({
        type: "deposit",
        amount: amount.toString()
      })
    )
    return this.client.signAndSend(
      { address: this.address, rpc: payload },
      GAS_LIMIT
    )
  }
}
