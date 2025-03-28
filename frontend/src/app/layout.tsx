"use client"

import { Inter } from "next/font/google"
import "./globals.css"
import { MarketProvider } from "@/contexts/MarketContext"
import { WalletProvider } from "@/contexts/WalletContext"
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/Navbar"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background`}>
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
            </MarketProvider>
          </WalletProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
