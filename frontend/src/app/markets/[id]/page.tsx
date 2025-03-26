"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useMarketActions } from "@/hooks/useMarketActions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Market } from "@/types/market"

export default function MarketDetail() {
  const params = useParams()
  const { placeTrade } = useMarketActions()
  const [market, setMarket] = useState<Market | null>(null)
  const [amount, setAmount] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch market details from Partisia blockchain
    const mockMarket: Market = {
      id: params.id as string,
      title: "Sample Market",
      description: "This is a sample market for testing purposes.",
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      createdBy: "user123",
      totalLiquidity: 1000,
      yesPrice: 0.6,
      noPrice: 0.4,
      status: "ACTIVE",
      createdAt: new Date()
    }
    setMarket(mockMarket)
    setLoading(false)
  }, [params.id])

  const handleTrade = async (isYes: boolean) => {
    if (!market || !amount) return
    try {
      await placeTrade(market.id, parseFloat(amount), isYes)
      // TODO: Refresh market data
    } catch (error) {
      console.error("Failed to place trade:", error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!market) {
    return <div>Market not found</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{market.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{market.description}</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <p className="text-sm font-medium">Yes Price</p>
              <p className="text-2xl font-bold">{market.yesPrice.toFixed(2)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">No Price</p>
              <p className="text-2xl font-bold">{market.noPrice.toFixed(2)}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium">
                Amount (MPC)
              </label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAmount(e.target.value)
                }
                placeholder="Enter amount"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handleTrade(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                Buy Yes
              </Button>
              <Button
                onClick={() => handleTrade(false)}
                className="bg-red-600 hover:bg-red-700"
              >
                Buy No
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
