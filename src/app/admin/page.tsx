import Link from 'next/link'

export default function AdminPage() {
  return (
    <main className="max-w-6xl mx-auto p-8 space-y-10">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <Link
          href="/admin/users"
          className="border rounded-xl p-6 hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold mb-2">
            Users
          </h2>
          <p className="text-sm text-gray-600">
            View and manage platform users.
          </p>
        </Link>

        <Link
          href="/admin/auctions"
          className="border rounded-xl p-6 hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold mb-2">
            Auctions
          </h2>
          <p className="text-sm text-gray-600">
            Create, edit, or remove auctions.
          </p>
        </Link>

        <Link
          href="/admin/products"
          className="border rounded-xl p-6 hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold mb-2">
            Products
          </h2>
          <p className="text-sm text-gray-600">
            Manage product listings.
          </p>
        </Link>

      </div>
    </main>
  )
}
