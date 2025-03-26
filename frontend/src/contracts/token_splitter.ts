import { BlockchainTransactionClient } from "@partisiablockchain/blockchain-api-transaction-client"

export type Address = string

export enum LifeStage {
  PREPARING = 0,
  ACTIVE = 1,
  SETTLED = 2
}

export interface TokenBalance {
  a_tokens: bigint
  b_tokens: bigint
  liquidity_tokens: bigint
}

export interface TokenBalances {
  token_lp_address: Address
  token_a_address: Address
  token_b_address: Address
  balances: Map<Address, TokenBalance>
}

export interface TokenSplitterContractState {
  event_description: string
  event_symbol: string
  original_token_address: Address
  true_token_address: Address
  false_token_address: Address
  arbitrator_address: Address
  token_splitter_address: Address
  life_stage: LifeStage
  token_balances: TokenBalances
}

export class TokenSplitterContract {
  constructor(
    private readonly client: BlockchainTransactionClient,
    private readonly address: string
  ) {}

  initialize(
    description: string,
    symbol: string,
    originalTokenAddress: string,
    trueTokenAddress: string,
    falseTokenAddress: string,
    arbitratorAddress: string
  ) {
    return this.client.createTransaction({
      contract: this.address,
      payload: {
        type: "initialize",
        description,
        symbol,
        originalTokenAddress,
        trueTokenAddress,
        falseTokenAddress,
        arbitratorAddress
      },
      gasLimit: BigInt(20_000_000)
    })
  }

  async deposit(tokenAddress: Address, amount: bigint) {
    const payload = Buffer.from(
      JSON.stringify({ tokenAddress, amount: amount.toString() })
    )
    return this.client.signAndSend(
      { address: this.address, rpc: payload },
      100000
    )
  }

  async withdraw(
    tokenAddress: Address,
    amount: bigint,
    waitForCallback: boolean
  ) {
    const payload = Buffer.from(
      JSON.stringify({
        tokenAddress,
        amount: amount.toString(),
        waitForCallback
      })
    )
    return this.client.signAndSend(
      { address: this.address, rpc: payload },
      100000
    )
  }

  async prepare(amount: bigint) {
    const payload = Buffer.from(JSON.stringify({ amount: amount.toString() }))
    return this.client.signAndSend(
      { address: this.address, rpc: payload },
      100000
    )
  }

  async split(amount: bigint) {
    const payload = Buffer.from(JSON.stringify({ amount: amount.toString() }))
    return this.client.signAndSend(
      { address: this.address, rpc: payload },
      100000
    )
  }

  async join(amount: bigint) {
    const payload = Buffer.from(JSON.stringify({ amount: amount.toString() }))
    return this.client.signAndSend(
      { address: this.address, rpc: payload },
      100000
    )
  }

  async settle(outcome: boolean) {
    const payload = Buffer.from(JSON.stringify({ outcome }))
    return this.client.signAndSend(
      { address: this.address, rpc: payload },
      100000
    )
  }

  async redeem(amount: bigint) {
    const payload = Buffer.from(JSON.stringify({ amount: amount.toString() }))
    return this.client.signAndSend(
      { address: this.address, rpc: payload },
      100000
    )
  }
}
