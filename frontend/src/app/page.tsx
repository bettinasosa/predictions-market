import { MarketList } from "@/components/MarketList"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to ProphetX</h1>
        <p className="text-xl text-muted-foreground">
          Trade on the outcomes of future events using Partisia Blockchain
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/create">
            <Button size="lg">Create a Market</Button>
          </Link>
          <Link href="/markets">
            <Button variant="outline" size="lg">
              Browse Markets
            </Button>
          </Link>
        </div>
      </div>
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Active Markets</h2>
        <MarketList />
      </div>
    </div>
  )
}
