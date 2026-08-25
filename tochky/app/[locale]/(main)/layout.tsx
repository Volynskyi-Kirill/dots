import { Navbar } from "@/components/layout/Navbar"

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
    </div>
  )
}
