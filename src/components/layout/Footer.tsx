import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-20 border-t bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold mb-2">Gavel</h3>
            <p className="text-sm text-gray-600">
              A modern auction platform where bids are powered by tokens.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/auctions" className="hover:text-black">
                  Auctions
                </Link>
              </li>
              <li>
                <Link href="/tokens" className="hover:text-black">
                  Buy Tokens
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-black">
                  Profile
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Support</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <a href="#" className="hover:text-black">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-black">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <a href="#" className="hover:text-black">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-black">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t flex flex-col md:flex-row items-center justify-between text-sm text-gray-500">
          <p>
            © {new Date().getFullYear()} Gavel. All rights reserved.
          </p>

          <p className="mt-2 md:mt-0">
            Payments secured by Paystack
          </p>
        </div>
      </div>
    </footer>
  )
}
