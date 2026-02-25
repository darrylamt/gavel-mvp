/// <reference types="react" />
import type { JSX } from 'react'
import Link from 'next/link'

export default function NotFound(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 py-16">
      <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 text-center text-gray-600">
        The page you’re looking for doesn’t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
      >
        Go to home
      </Link>
    </main>
  )
}