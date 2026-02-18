'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'

type ShopProduct = {
  id: string
  title: string
  description: string | null
  price: number
  stock: number
  status: 'draft' | 'active' | 'sold_out' | 'archived'
  image_url: string | null
  created_at: string
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [status, setStatus] = useState<ShopProduct['status']>('active')
  const [imageUrl, setImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  const loadProducts = async () => {
    setLoading(true)
    setError(null)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const token = session?.access_token
    if (!token) {
      setError('Unauthorized')
      setLoading(false)
      return
    }

    const res = await fetch('/api/admin/products', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to load products')
      setLoading(false)
      return
    }

    setProducts((data.products ?? []) as ShopProduct[])
    setLoading(false)
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload/product-image', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Image upload failed')

      setImageUrl(data.url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setUploadingImage(false)
      event.target.value = ''
    }
  }

  const createProduct = async () => {
    setSaving(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) throw new Error('Unauthorized')

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          price: Number(price),
          stock: Number(stock),
          status,
          image_url: imageUrl,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create product')

      setProducts((previous) => [data.product as ShopProduct, ...previous])
      setTitle('')
      setDescription('')
      setPrice('')
      setStock('')
      setStatus('active')
      setImageUrl('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create product')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell>
      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <h2 className="mb-4 text-xl font-semibold">Add Shop Product</h2>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Product Image</label>
            <input type="file" accept="image/*" onChange={handleImageSelect} className="w-full rounded-lg border px-3 py-2" />
            <p className="mt-1 text-xs text-gray-500">Select an image from your device.</p>
            {uploadingImage && <p className="mt-1 text-xs text-gray-600">Uploading image…</p>}
            {imageUrl && <p className="mt-1 truncate text-xs text-gray-500">Uploaded: {imageUrl}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Price (GHS)</label>
            <input type="number" value={price} onChange={(event) => setPrice(event.target.value)} className="w-full rounded-lg border px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Stock</label>
            <input type="number" value={stock} onChange={(event) => setStock(event.target.value)} className="w-full rounded-lg border px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <select value={status} onChange={(event) => setStatus(event.target.value as ShopProduct['status'])} className="w-full rounded-lg border px-3 py-2">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="sold_out">Sold out</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="w-full rounded-lg border px-3 py-2" />
          </div>
          {imageUrl && (
            <div className="md:col-span-2">
              <img src={imageUrl} alt="Product preview" className="h-28 w-28 rounded-lg border object-cover" />
            </div>
          )}
        </div>

        <button
          onClick={createProduct}
          disabled={saving}
          className="mt-4 rounded-lg bg-black px-4 py-2 font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Create Product'}
        </button>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <h2 className="mb-4 text-xl font-semibold">Shop Products</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-gray-500">No products yet.</p>
        ) : (
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2">Title</th>
                  <th className="py-2">Price</th>
                  <th className="py-2">Stock</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t">
                    <td className="py-2">{product.title}</td>
                    <td className="py-2">GHS {Number(product.price).toLocaleString()}</td>
                    <td className="py-2">{product.stock}</td>
                    <td className="py-2 capitalize">{product.status.replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
