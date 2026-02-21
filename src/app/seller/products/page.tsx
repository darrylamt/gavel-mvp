'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type ShopProduct = {
  id: string
  title: string
  description: string | null
  price: number
  stock: number
  status: 'draft' | 'active' | 'sold_out' | 'archived'
  category: string
  image_url: string | null
  created_at: string
  shop_id: string | null
}

type ShopOption = {
  id: string
  name: string
  status: string
}

type ShopCategoryOption = {
  name: string
  slug: string
  image_url: string | null
}

export default function SellerProductsPage() {
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [shops, setShops] = useState<ShopOption[]>([])
  const [categories, setCategories] = useState<ShopCategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [status, setStatus] = useState<ShopProduct['status']>('active')
  const [category, setCategory] = useState('Other')
  const [shopId, setShopId] = useState('')
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

    const loadedProducts = (data.products ?? []) as ShopProduct[]
    const loadedShops = (data.shops ?? []) as ShopOption[]
    const loadedCategories = (data.categories ?? []) as ShopCategoryOption[]

    setProducts(loadedProducts)
    setShops(loadedShops)
    setCategories(loadedCategories)
    if (loadedShops.length > 0 && !shopId) {
      setShopId(loadedShops[0].id)
    }
    setCategory((previous) => {
      if (loadedCategories.length === 0) return previous
      return loadedCategories.some((item) => item.name === previous) ? previous : loadedCategories[0].name
    })
    setLoading(false)
  }

  useEffect(() => {
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setPrice('')
    setStock('')
    setStatus('active')
    setCategory(categories[0]?.name ?? 'Other')
    setShopId(shops[0]?.id ?? '')
    setImageUrl('')
    setEditingId(null)
    setFormMode('create')
  }

  const openCreateForm = () => {
    setError(null)
    resetForm()
    setFormOpen(true)
  }

  const openEditForm = (product: ShopProduct) => {
    setError(null)
    setFormMode('edit')
    setEditingId(product.id)
    setTitle(product.title)
    setDescription(product.description ?? '')
    setPrice(String(product.price))
    setStock(String(product.stock))
    setStatus(product.status)
    setCategory(product.category || categories[0]?.name || 'Other')
    setShopId(product.shop_id ?? shops[0]?.id ?? '')
    setImageUrl(product.image_url ?? '')
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    resetForm()
  }

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

  const submitProduct = async () => {
    setSaving(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) throw new Error('Unauthorized')

      const payload = {
        id: editingId,
        title,
        description,
        price: Number(price),
        stock: Number(stock),
        status,
        category,
        shop_id: shopId,
        image_url: imageUrl,
      }

      const res = await fetch('/api/admin/products', {
        method: formMode === 'edit' ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to ${formMode === 'edit' ? 'update' : 'create'} product`)

      if (formMode === 'edit') {
        setProducts((previous) =>
          previous.map((product) => (product.id === data.product.id ? (data.product as ShopProduct) : product))
        )
      } else {
        setProducts((previous) => [data.product as ShopProduct, ...previous])
      }

      closeForm()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${formMode === 'edit' ? 'update' : 'create'} product`)
    } finally {
      setSaving(false)
    }
  }

  const deleteProduct = async (product: ShopProduct) => {
    const confirmed = window.confirm(`Delete "${product.title}"?`)
    if (!confirmed) return

    setDeletingId(product.id)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) throw new Error('Unauthorized')

      const res = await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: product.id }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete product')

      setProducts((previous) => previous.filter((item) => item.id !== product.id))

      if (editingId === product.id) {
        closeForm()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete product')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">My Buy-Now Products</h2>
            <p className="mt-1 text-sm text-gray-500">Create and manage products for direct purchase.</p>
          </div>
          <button
            onClick={openCreateForm}
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            New Product
          </button>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <p className="text-sm text-gray-500">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-gray-500">No products yet.</p>
        ) : (
          <div className="max-h-[30rem] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2">Title</th>
                  <th className="py-2">Price</th>
                  <th className="py-2">Stock</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Shop</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.title} className="h-8 w-8 rounded border object-cover" />
                        ) : null}
                        <span>{product.title}</span>
                      </div>
                    </td>
                    <td className="py-2">GHS {Number(product.price).toLocaleString()}</td>
                    <td className="py-2">{product.stock}</td>
                    <td className="py-2">{product.category}</td>
                    <td className="py-2">{shops.find((shop) => shop.id === product.shop_id)?.name || '—'}</td>
                    <td className="py-2 capitalize">{product.status.replace('_', ' ')}</td>
                    <td className="py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditForm(product)}
                          className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteProduct(product)}
                          disabled={deletingId === product.id}
                          className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === product.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">{formMode === 'edit' ? 'Edit Product' : 'New Product'}</h2>
            <button onClick={closeForm} className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">
              Close
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border px-3 py-2" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Product Image</label>
              <input type="file" accept="image/*" onChange={handleImageSelect} className="w-full rounded-lg border px-3 py-2" />
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
              <label className="mb-1 block text-sm font-medium text-gray-700">Shop</label>
              <select value={shopId} onChange={(event) => setShopId(event.target.value)} className="w-full rounded-lg border px-3 py-2">
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-lg border px-3 py-2">
                {categories.map((item) => (
                  <option key={item.slug} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
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
          </div>

          <button
            onClick={submitProduct}
            disabled={saving}
            className="mt-4 rounded-lg bg-black px-4 py-2 font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saving ? 'Saving…' : formMode === 'edit' ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      )}
    </main>
  )
}
