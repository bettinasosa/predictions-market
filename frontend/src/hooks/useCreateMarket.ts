"use client"

import { useState } from "react"
import { useWallet } from "@/contexts/WalletContext"
import { z } from "zod"

const MarketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  endDate: z.date().min(new Date(), "End date must be in the future"),
  prize: z.number().min(0.1, "Prize must be at least 0.1 MPC")
})

type MarketInput = z.infer<typeof MarketSchema>

export function useCreateMarket() {
  const { state, signAndSendTransaction } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createMarket = async (input: MarketInput) => {
    try {
      setLoading(true)
      setError(null)

      // Validate input
      const validatedInput = MarketSchema.parse(input)

      // Convert prize to smallest unit (assuming 18 decimals)
      const prizeInSmallestUnit = Math.floor(validatedInput.prize * 10 ** 18)

      // Create market payload
      const payload = {
        title: validatedInput.title,
        description: validatedInput.description,
        endDate: validatedInput.endDate.getTime(),
        prize: prizeInSmallestUnit.toString()
      }

      // Convert payload to Buffer
      const rpc = Buffer.from(JSON.stringify(payload))

      // Send transaction
      const result = await signAndSendTransaction(
        {
          rpc,
          contractAddress: process.env.NEXT_PUBLIC_MARKET_CONTRACT_ADDRESS!
        },
        prizeInSmallestUnit
      )

      return result.transactionHash
    } catch (err) {
      console.error("Error creating market:", err)
      setError(err instanceof Error ? err.message : "Failed to create market")
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    createMarket,
    loading,
    error,
    isWalletConnected: state.connected
  }
}
