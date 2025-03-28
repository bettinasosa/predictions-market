"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@/contexts/WalletContext"
import { useTokenSplitter } from "@/hooks/useTokenSplitter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

type FormData = {
  title: string
  description: string
  endDate: string
  initialLiquidity: string
}

export default function CreateMarket() {
  const router = useRouter()
  const { state } = useWallet()
  const { initialize } = useTokenSplitter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    endDate: "",
    initialLiquidity: "0"
  })

  // Redirect if not connected
  useEffect(() => {
    if (!state.connected) {
      toast.error("Please connect your wallet first")
      router.push("/")
    }
  }, [state.connected, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const initialLiquidity = parseFloat(formData.initialLiquidity)
    if (isNaN(initialLiquidity) || initialLiquidity <= 0) {
      toast.error("Please enter a valid initial liquidity amount")
      return
    }

    setIsLoading(true)
    try {
      // Create the market directly using the initialize method
      const result = await initialize(
        formData.description,
        formData.title,
        "MPC", // Original token address
        "MPC_YES", // True token address
        "MPC_NO", // False token address
        state.address // Arbitrator address (market creator)
      )

      toast.success(
        <div>
          Market created successfully!
          <br />
          Transaction ID: {result.toString()}
        </div>
      )
      router.push("/markets")
    } catch (error) {
      console.error("Failed to create market:", error)
      toast.error("Failed to create market. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Don't render anything if not connected
  if (!state.connected) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create a New Market</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Market Title
              </label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="endDate" className="text-sm font-medium">
                End Date
              </label>
              <Input
                id="endDate"
                type="datetime-local"
                value={formData.endDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="initialLiquidity" className="text-sm font-medium">
                Initial Liquidity (MPC)
              </label>
              <Input
                id="initialLiquidity"
                type="number"
                min="0"
                step="0.01"
                value={formData.initialLiquidity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({
                    ...formData,
                    initialLiquidity: e.target.value
                  })
                }
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating Market..." : "Create Market"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
