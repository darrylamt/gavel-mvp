import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Instagram, Github, Twitter } from 'lucide-react'
import navLogo from '@/app/NAVLOGO.jpeg'

export default function Footer() {
  return (
    <footer className="bg-gray-50 py-10 sm:pt-16 lg:pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-12 gap-y-16 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 md:col-span-3 lg:col-span-2 lg:pr-8">
            <Link href="/" className="inline-flex hover:opacity-80">
              <Image src={navLogo} alt="Gavel" className="h-10 w-auto" />
            </Link>

            <p className="mt-7 text-base leading-relaxed text-gray-600">
              A modern auction platform where bids are powered by tokens, auctions are transparent,
              and winning is seamless.
            </p>

            <ul className="mt-9 flex items-center space-x-3">
              <li>
                <a
                  href="https://x.com/gavelgh"
                  aria-label="Twitter"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-white transition-all duration-200 hover:bg-blue-600 focus:bg-blue-600"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.facebook.com/share/1XVgK95jJh/"
                  aria-label="Facebook"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-white transition-all duration-200 hover:bg-blue-600 focus:bg-blue-600"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/gavel.gh/"
                  aria-label="Instagram"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-white transition-all duration-200 hover:bg-blue-600 focus:bg-blue-600"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-gray-400">Company</p>

            <ul className="mt-6 space-y-4">
              <li>
                <Link href="/" className="flex text-base text-black transition-all duration-200 hover:text-blue-600 focus:text-blue-600">
                  About
                </Link>
              </li>
              <li>
                <Link href="/auctions" className="flex text-base text-black transition-all duration-200 hover:text-blue-600 focus:text-blue-600">
                  Auctions
                </Link>
              </li>
              <li>
                <Link href="/tokens" className="flex text-base text-black transition-all duration-200 hover:text-blue-600 focus:text-blue-600">
                  Tokens
                </Link>
              </li>
              <li>
                <Link href="/contact" className="flex text-base text-black transition-all duration-200 hover:text-blue-600 focus:text-blue-600">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-gray-400">Help</p>

            <ul className="mt-6 space-y-4">
              <li>
                <Link href="/faq" className="flex text-base text-black transition-all duration-200 hover:text-blue-600 focus:text-blue-600">
                  Customer Support
                </Link>
              </li>
              <li>
                <Link href="/contact" className="flex text-base text-black transition-all duration-200 hover:text-blue-600 focus:text-blue-600">
                  Delivery Details
                </Link>
              </li>
              <li>
                <Link href="/terms" className="flex text-base text-black transition-all duration-200 hover:text-blue-600 focus:text-blue-600">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="flex text-base text-black transition-all duration-200 hover:text-blue-600 focus:text-blue-600">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1 lg:col-span-2 lg:pl-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-gray-400">Subscribe to newsletter</p>

            <form className="mt-6" action="#" method="POST">
              <div>
                <label htmlFor="newsletter-email" className="sr-only">Email</label>
                <input
                  id="newsletter-email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  className="block w-full rounded-md border border-gray-200 bg-white p-4 text-black placeholder-gray-500 caret-blue-600 transition-all duration-200 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="mt-3 inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-4 font-semibold text-white transition-all duration-200 hover:bg-blue-700 focus:bg-blue-700"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <hr className="my-10 mt-16 border-gray-200" />

        <p className="text-center text-sm text-gray-600">
          © {new Date().getFullYear()} Gavel. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
