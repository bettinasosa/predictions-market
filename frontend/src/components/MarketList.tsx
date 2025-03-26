"use client"

import { useMarket } from "@/contexts/MarketContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

export function MarketList() {
  const { state } = useMarket()
  const { markets, loading, error } = state

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        <p>Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {markets.map(market => (
        <Card key={market.id}>
          <CardHeader>
            <CardTitle>{market.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">{market.description}</p>
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm">Yes: {market.yesPrice.toFixed(2)}</p>
                <p className="text-sm">No: {market.noPrice.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm">Liquidity: {market.totalLiquidity}</p>
                <p className="text-sm">
                  Ends: {market.endDate.toLocaleDateString()}
                </p>
              </div>
            </div>
            <Link href={`/markets/${market.id}`}>
              <Button className="w-full">View Market</Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
