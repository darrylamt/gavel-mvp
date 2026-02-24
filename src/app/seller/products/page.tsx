'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import PieChartCard from '@/components/base/PieChartCard'

type ShopProduct = {
  id: string
  title: string
  description: string | null
  price: number
  seller_base_price: number | null
  stock: number
  status: 'draft' | 'active' | 'sold_out' | 'archived'
  category: string
  image_url: string | null
  created_at: string
  shop_id: string | null
  variants?: ShopProductVariant[]
}

type ShopProductVariant = {
  id: string
  product_id: string
  color: string | null
  size: string | null
  sku: string | null
  price: number
  seller_base_price: number | null
  stock: number
  is_default: boolean
  is_active: boolean
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

type ProductVariantDraft = {
  id?: string
  color: string
  size: string
  sku: string
  price: string
  stock: string
  image_url: string
  is_default: boolean
  is_active: boolean
}

function createEmptyVariant(): ProductVariantDraft {
  return {
    color: '',
    size: '',
    sku: '',
    price: '',
    stock: '',
    image_url: '',
    is_default: false,
    is_active: true,
  }
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
  const [searchQuery, setSearchQuery] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [status, setStatus] = useState<ShopProduct['status']>('active')
  const [category, setCategory] = useState('Other')
  const [shopId, setShopId] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [useVariants, setUseVariants] = useState(false)
  const [variants, setVariants] = useState<ProductVariantDraft[]>([createEmptyVariant()])
  const [uploadingVariantIndex, setUploadingVariantIndex] = useState<number | null>(null)

  const parsedPrice = Number(price)
  const hasValidPrice = Number.isFinite(parsedPrice) && parsedPrice >= 0
  const listedPricePreview = hasValidPrice ? Number((parsedPrice * 1.1).toFixed(2)) : null

  const variantPricePreview = useMemo(
    () =>
      variants.map((variant) => {
        const numeric = Number(variant.price)
        if (!Number.isFinite(numeric) || numeric < 0) {
          return null
        }
        return Number((numeric * 1.1).toFixed(2))
      }),
    [variants]
  )

  const statusPie = useMemo(() => {
    const grouped = new Map<string, number>()
    for (const product of products) {
      const key = product.status || 'unknown'
      grouped.set(key, (grouped.get(key) ?? 0) + 1)
    }
    return Array.from(grouped.entries()).map(([label, value]) => ({ label, value }))
  }, [products])

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    if (!normalizedQuery) return products

    return products.filter((product) => product.title.toLowerCase().includes(normalizedQuery))
  }, [products, searchQuery])

  const categoryPie = useMemo(() => {
    const grouped = new Map<string, number>()
    for (const product of products) {
      const key = product.category || 'Other'
      grouped.set(key, (grouped.get(key) ?? 0) + 1)
    }

    return Array.from(grouped.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value }))
  }, [products])

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
    setUseVariants(false)
    setVariants([createEmptyVariant()])
    setUploadingVariantIndex(null)
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
    const basePrice =
      typeof product.seller_base_price === 'number' && Number.isFinite(product.seller_base_price)
        ? Number(product.seller_base_price)
        : Number((Number(product.price) / 1.1).toFixed(2))
    setPrice(String(basePrice))
    setStock(String(product.stock))
    setStatus(product.status)
    setCategory(product.category || categories[0]?.name || 'Other')
    setShopId(product.shop_id ?? shops[0]?.id ?? '')
    setImageUrl(product.image_url ?? '')
    const activeVariants = (product.variants ?? []).filter((variant) => variant.is_active)
    if (activeVariants.length > 0) {
      setUseVariants(true)
      setVariants(
        activeVariants.map((variant, index) => {
          const basePrice =
            typeof variant.seller_base_price === 'number' && Number.isFinite(variant.seller_base_price)
              ? Number(variant.seller_base_price)
              : Number((Number(variant.price) / 1.1).toFixed(2))

          return {
            id: variant.id,
            color: variant.color ?? '',
            size: variant.size ?? '',
            sku: variant.sku ?? '',
            price: String(basePrice),
            stock: String(variant.stock ?? 0),
            image_url: variant.image_url ?? '',
            is_default: index === 0 ? true : variant.is_default,
            is_active: variant.is_active,
          }
        })
      )
    } else {
      setUseVariants(false)
      setVariants([createEmptyVariant()])
    }
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    resetForm()
  }

  const addVariantRow = () => {
    setVariants((previous) => [...previous, createEmptyVariant()])
  }

  const updateVariantRow = (index: number, key: keyof ProductVariantDraft, value: string | boolean) => {
    setVariants((previous) =>
      previous.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [key]: value } : variant
      )
    )
  }

  const removeVariantRow = (index: number) => {
    setVariants((previous) => {
      const next = previous.filter((_, variantIndex) => variantIndex !== index)
      if (next.length === 0) {
        return [createEmptyVariant()]
      }

      if (!next.some((variant) => variant.is_default)) {
        next[0] = { ...next[0], is_default: true }
      }

      return next
    })
  }

  const setDefaultVariant = (index: number) => {
    setVariants((previous) => previous.map((variant, variantIndex) => ({ ...variant, is_default: variantIndex === index })))
  }

  const handleVariantImageSelect = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingVariantIndex(index)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload/product-image', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Variant image upload failed')

      updateVariantRow(index, 'image_url', String(data.url || ''))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Variant image upload failed')
    } finally {
      setUploadingVariantIndex(null)
      event.target.value = ''
    }
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
        variants: useVariants
          ? variants
              .filter((variant) => {
                const hasLabel = Boolean(variant.color.trim() || variant.size.trim() || variant.sku.trim())
                const hasPrice = Number.isFinite(Number(variant.price))
                const hasStock = Number.isFinite(Number(variant.stock))
                const hasImage = Boolean(variant.image_url.trim())
                return hasLabel || hasPrice || hasStock || hasImage
              })
              .map((variant, index) => ({
                id: variant.id,
                color: variant.color.trim() || null,
                size: variant.size.trim() || null,
                sku: variant.sku.trim() || null,
                price: Number(variant.price),
                stock: Math.max(0, Math.floor(Number(variant.stock))),
                image_url: variant.image_url.trim() || null,
                is_default: variant.is_default || index === 0,
                is_active: variant.is_active,
              }))
          : undefined,
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
            <h2 className="text-xl font-semibold">My Products</h2>
            <p className="mt-1 text-sm text-gray-500">Add, manage, and review buy-now product listings and history.</p>
          </div>
          <button
            onClick={openCreateForm}
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Add Product
          </button>
        </div>

        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <PieChartCard title="Product Status Split" points={statusPie} emptyLabel="No products yet" />
          <PieChartCard title="Top Categories" points={categoryPie} emptyLabel="No category data yet" />
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search products by title"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:max-w-xs"
          />
          <p className="text-xs text-gray-500">Showing {filteredProducts.length} of {products.length} products</p>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <p className="text-sm text-gray-500">Loading products…</p>
        ) : filteredProducts.length === 0 ? (
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
                  <th className="py-2">Created</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
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
                    <td className="py-2">{product.created_at ? new Date(product.created_at).toLocaleString() : '-'}</td>
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
            <h2 className="text-xl font-semibold">{formMode === 'edit' ? 'Edit Product' : 'Add Product'}</h2>
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
              <div className="mb-2 flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                  {uploadingImage ? 'Uploading…' : 'Upload image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage || saving}
                    onChange={handleImageSelect}
                  />
                </label>
                {imageUrl && <span className="text-xs text-gray-500">Image uploaded</span>}
              </div>
              {uploadingImage && <p className="mt-1 text-xs text-gray-600">Uploading image…</p>}
              {imageUrl && <img src={imageUrl} alt="Product preview" className="mt-2 h-24 w-24 rounded-lg border object-cover" />}
            </div>
            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={useVariants}
                  onChange={(event) => setUseVariants(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                This product has variants (different colors/sizes/prices)
              </label>
            </div>
            {!useVariants ? (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Price (GHS)</label>
                  <input type="number" value={price} onChange={(event) => setPrice(event.target.value)} className="w-full rounded-lg border px-3 py-2" />
                  <p className="mt-1 text-xs text-gray-500">Listed price adds 10% automatically when sellers save a product.</p>
                  {listedPricePreview != null && (
                    <p className="mt-1 text-xs font-medium text-gray-700">
                      You enter: GHS {parsedPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} • Listed price: GHS {listedPricePreview.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Stock</label>
                  <input type="number" value={stock} onChange={(event) => setStock(event.target.value)} className="w-full rounded-lg border px-3 py-2" />
                </div>
              </>
            ) : (
              <div className="md:col-span-2 rounded-xl border border-gray-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800">Variants</p>
                  <button type="button" onClick={addVariantRow} className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50">
                    Add Variant
                  </button>
                </div>
                <div className="space-y-3">
                  {variants.map((variant, index) => (
                    <div key={`${variant.id ?? 'new'}-${index}`} className="rounded-lg border border-gray-200 p-3">
                      <div className="grid gap-3 md:grid-cols-6">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">Color</label>
                          <input value={variant.color} onChange={(event) => updateVariantRow(index, 'color', event.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">Size</label>
                          <input value={variant.size} onChange={(event) => updateVariantRow(index, 'size', event.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">SKU</label>
                          <input value={variant.sku} onChange={(event) => updateVariantRow(index, 'sku', event.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">Price (GHS)</label>
                          <input type="number" value={variant.price} onChange={(event) => updateVariantRow(index, 'price', event.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm" />
                          {variantPricePreview[index] != null && (
                            <p className="mt-1 text-[11px] text-gray-500">Listed: GHS {Number(variantPricePreview[index]).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">Stock</label>
                          <input type="number" value={variant.stock} onChange={(event) => updateVariantRow(index, 'stock', event.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm" />
                        </div>
                        <div className="flex items-end gap-2 pb-1">
                          <label className="inline-flex items-center gap-1 text-xs text-gray-600">
                            <input type="radio" checked={variant.is_default} onChange={() => setDefaultVariant(index)} />
                            Default
                          </label>
                          <button type="button" onClick={() => removeVariantRow(index)} className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                          {uploadingVariantIndex === index ? 'Uploading…' : 'Upload variant image'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={saving || uploadingVariantIndex !== null}
                            onChange={(event) => handleVariantImageSelect(index, event)}
                          />
                        </label>
                        {variant.image_url && (
                          <button
                            type="button"
                            onClick={() => updateVariantRow(index, 'image_url', '')}
                            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                          >
                            Remove image
                          </button>
                        )}
                      </div>
                      {variant.image_url && <img src={variant.image_url} alt="Variant preview" className="mt-2 h-20 w-20 rounded-lg border object-cover" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            {saving ? 'Saving…' : formMode === 'edit' ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      )}
    </main>
  )
}
