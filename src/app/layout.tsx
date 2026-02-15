import Footer from '@/components/layout/Footer'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import WelcomeTourModal from '@/components/layout/WelcomeTourModal'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <WelcomeTourModal />
        {children}
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}