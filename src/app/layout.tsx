import Footer from '@/components/layout/Footer'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import { Analytics } from "@vercel/analytics/next"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <Analytics/>
      <body>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  )
}