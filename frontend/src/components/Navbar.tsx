"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"
import { useWallet } from "@/contexts/WalletContext"

export function Navbar() {
  const { theme, setTheme } = useTheme()
  const { state, connect, disconnect } = useWallet()

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          ProphetX
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/markets">
            <Button variant="ghost">Markets</Button>
          </Link>
          <Link href="/create">
            <Button>Create Market</Button>
          </Link>
          {state.connected ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {state.address.slice(0, 6)}...{state.address.slice(-4)}
              </span>
              <Button variant="outline" onClick={disconnect}>
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={connect}>Connect Wallet</Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </nav>
  )
}
