'use client'

import Link from 'next/link'
import { useIsAdmin } from '@/hooks/useIsAdmin'

export default function Navbar() {
  const isAdmin = useIsAdmin()

  return (
    <nav className="w-full border-b p-4 flex gap-4">
      <Link href="/">Home</Link>
      <Link href="/auctions">Auctions</Link>

      {/* ADMIN LINKS */}
      {isAdmin === true && (
        <>
          <Link href="/admin">Admin</Link>
          <Link href="/admin/new">Create Auction</Link>
        </>
      )}
    </nav>
  )
}
