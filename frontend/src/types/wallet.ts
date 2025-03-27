export interface TransactionMessage {
  contract: string
  payload: string
  payloadType: "hex_payload"
  gas?: string
  chainId?: string
}

export interface PartisiaSDK {
  connect: (config: {
    permissions: string[]
    dappName: string
    chainId: string
    node: string
  }) => Promise<void>
  getAddress: () => Promise<string>
  signMessage: (message: TransactionMessage) => Promise<string>
}

declare global {
  interface Window {
    PartiTestWallet: {
      sdk: () => Promise<PartisiaSDK>
    }
  }
}

export interface TokenSplitterMethods {
  deposit: (tokenAddress: string, amount: bigint) => Promise<string>
  withdraw: (tokenAddress: string, amount: bigint) => Promise<string>
}
