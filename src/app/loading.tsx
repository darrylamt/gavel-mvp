import Image from 'next/image'
import navLogo from '@/assets/branding/nav-logo.png'

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Image
        src={navLogo}
        alt="Gavel"
        className="h-16 w-auto animate-pulse"
        priority
      />
    </div>
  )
}