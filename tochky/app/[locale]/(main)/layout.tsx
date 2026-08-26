import { Navbar } from "@/components/layout/Navbar"
import { Analytics } from "@vercel/analytics/react"

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen flex flex-col relative">
      <Navbar />
      <div className="flex-1">
        {children}
      </div>
      <Analytics />
    </div>
  )
}
