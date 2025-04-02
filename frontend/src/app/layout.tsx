import { Inter } from "next/font/google"
import "./globals.css"
import { ClientLayout } from "@/components/ClientLayout"
import { metadata } from "./metadata"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
