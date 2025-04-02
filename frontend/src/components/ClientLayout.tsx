"use client"

import { WalletProvider } from "@/contexts/WalletContext"
import { MarketProvider } from "@/contexts/MarketContext"
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/Navbar"
import { Toaster } from "sonner"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <WalletProvider>
        <MarketProvider>
          <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto py-8 px-4">{children}</main>
          </div>
          <Toaster />
        </MarketProvider>
      </WalletProvider>
    </ThemeProvider>
  )
}
