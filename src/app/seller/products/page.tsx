'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase, getSessionHeaders } from '@/lib/supabaseClient'
import PieChartCard from '@/components/base/PieChartCard'
import { Plus, Search, X, Eye, Pencil, Trash2, Package } from 'lucide-react'

type ShopProduct = {
  id: string
  title: string
  description: string | null
  price: number
  seller_base_price: number | null
  stock: number
  status: 'draft' | 'active' | 'sold_out' | 'archived'
  category: string
  requires_cargo: boolean
  image_url: string | null
  image_urls?: string[]
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
  image_url: string | null
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

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  sold_out: 'bg-red-100 text-red-700',
  archived: 'bg-yellow-100 text-yellow-700',
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
  const formRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (formOpen && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [formOpen])
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [detailProduct, setDetailProduct] = useState<ShopProduct | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [status, setStatus] = useState<ShopProduct['status']>('active')
  const [category, setCategory] = useState('Other')
  const [requiresCargo, setRequiresCargo] = useState(false)
  const [shopId, setShopId] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [useVariants, setUseVariants] = useState(false)
  const [variants, setVariants] = useState<ProductVariantDraft[]>([createEmptyVariant()])
  const [uploadingVariantIndex, setUploadingVariantIndex] = useState<number | null>(null)
  const [aiDescriptionLoading, setAiDescriptionLoading] = useState(false)
  const [aiDescriptionError, setAiDescriptionError] = useState<string | null>(null)
  const [descriptionGeneratedByAi, setDescriptionGeneratedByAi] = useState(false)

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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Your session has expired. Please sign in again.')
      setLoading(false)
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const token = session?.access_token
    if (!token) {
      setError('Your session has expired. Please sign in again.')
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
    setImageUrls([])
    setUseVariants(false)
    setVariants([createEmptyVariant()])
    setUploadingVariantIndex(null)
    setEditingId(null)
    setFormMode('create')
    setAiDescriptionLoading(false)
    setAiDescriptionError(null)
    setDescriptionGeneratedByAi(false)
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
    setRequiresCargo(product.requires_cargo ?? false)
    setShopId(product.shop_id ?? shops[0]?.id ?? '')
    setImageUrls(product.image_urls ?? [])
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

      const headers = await getSessionHeaders()
      const res = await fetch('/api/upload/product-image', {
        method: 'POST',
        headers,
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

  const generateDescriptionWithAi = async () => {
    setAiDescriptionLoading(true)
    setAiDescriptionError(null)

    try {
      if (imageUrls.length === 0) {
        throw new Error('Please upload an image first')
      }

      const imageUrl = imageUrls[0]!
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      const reader = new FileReader()

      reader.onload = async (event) => {
        try {
          const base64 = (event.target?.result as string).split(',')[1]
          if (!base64) throw new Error('Failed to convert image to base64')

          const mediaType = blob.type || 'image/jpeg'

          const aiRes = await fetch('/api/ai/describe-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64, mediaType, productName: title.trim() }),
          })

          if (!aiRes.ok) {
            const errData = await aiRes.json()
            throw new Error(errData.error || 'Failed to generate description')
          }

          const data = (await aiRes.json()) as { description?: string }
          if (data.description) {
            setDescription(data.description)
            setDescriptionGeneratedByAi(true)
            setAiDescriptionLoading(false)
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          setAiDescriptionError(message)
          setAiDescriptionLoading(false)
        }
      }

      reader.onerror = () => {
        setAiDescriptionError('Failed to read image file')
        setAiDescriptionLoading(false)
      }

      reader.readAsDataURL(blob)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate description'
      setAiDescriptionError(message)
      setAiDescriptionLoading(false)
    }
  }

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setError(null);

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        const headers = await getSessionHeaders()
        const res = await fetch('/api/upload/product-image', {
          method: 'POST',
          headers,
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Image upload failed');
        uploadedUrls.push(data.url);
      }
      setImageUrls((prev) => [...prev, ...uploadedUrls]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const submitProduct = async () => {
    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Your session has expired. Please sign in again.')

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) throw new Error('Your session has expired. Please sign in again.')

      const payload = {
        id: editingId,
        title,
        description,
        price: Number(price),
        stock: Number(stock),
        status,
        category,
        requires_cargo: requiresCargo,
        shop_id: shopId,
        image_urls: imageUrls,
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Your session has expired. Please sign in again.')

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) throw new Error('Your session has expired. Please sign in again.')

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

  const inputClass = 'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100'
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Products</h2>
            <p className="mt-0.5 text-sm text-gray-500">Add, manage, and review buy-now product listings.</p>
          </div>
          <button
            onClick={openCreateForm}
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Charts */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <PieChartCard title="Product Status Split" points={statusPie} emptyLabel="No products yet" />
          <PieChartCard title="Top Categories" points={categoryPie} emptyLabel="No category data yet" />
        </div>

        {/* Search bar */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xs w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search products…"
              className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm placeholder-gray-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <p className="text-xs text-gray-400">
            {filteredProducts.length} of {products.length} products
          </p>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Product list */}
        {loading ? (
          <div className="mt-6 flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center py-10 text-center">
            <Package className="mb-3 h-10 w-10 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">No products yet.</p>
          </div>
        ) : (
          <>
            {/* Mobile: Cards */}
            <div className="mt-4 space-y-3 sm:hidden">
              {filteredProducts.map((product) => {
                const thumb = product.image_urls?.[0] ?? product.image_url
                return (
                  <div
                    key={product.id}
                    className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={product.title}
                        className="h-14 w-14 flex-shrink-0 rounded-lg border border-gray-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100">
                        <Package className="h-6 w-6 text-gray-300" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">{product.title}</p>
                        <span
                          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            STATUS_BADGE[product.status] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {product.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                        <span>GHS {Number(product.price).toLocaleString()}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                            product.stock === 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {product.stock} in stock
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailProduct(product)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          <Eye className="h-3 w-3" />
                          Details
                        </button>
                        <button
                          onClick={() => openEditForm(product)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => deleteProduct(product)}
                          disabled={deletingId === product.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-3 w-3" />
                          {deletingId === product.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop: Table */}
            <div className="mt-4 hidden overflow-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Title</th>
                    <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Price</th>
                    <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Stock</th>
                    <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                    <th className="py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredProducts.map((product) => {
                    const thumb = product.image_urls?.[0] ?? product.image_url
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2.5">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={product.title}
                                className="h-9 w-9 flex-shrink-0 rounded-lg border border-gray-200 object-cover"
                              />
                            ) : (
                              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                                <Package className="h-4 w-4 text-gray-300" />
                              </div>
                            )}
                            <span className="font-medium text-gray-900">{product.title}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-700">GHS {Number(product.price).toLocaleString()}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              product.stock === 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {product.stock}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                              STATUS_BADGE[product.status] || 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {product.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailProduct(product)}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                            <button
                              onClick={() => openEditForm(product)}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => deleteProduct(product)}
                              disabled={deletingId === product.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {deletingId === product.id ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Product form */}
      {formOpen && (
        <div ref={formRef} className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              {formMode === 'edit' ? 'Edit Product' : 'Add New Product'}
            </h2>
            <button
              onClick={closeForm}
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={inputClass}
                placeholder="Product title"
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Product Images</label>
              <div className="mb-2 flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  {uploadingImage ? 'Uploading…' : 'Upload images'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={uploadingImage || saving}
                    onChange={handleImageSelect}
                  />
                </label>
                {imageUrls.length > 0 && (
                  <span className="text-xs text-gray-500">{imageUrls.length} image(s) uploaded</span>
                )}
              </div>
              {uploadingImage && (
                <p className="mt-1 text-xs text-gray-500">Uploading image…</p>
              )}
              {imageUrls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {imageUrls.map((url, idx) => (
                    <div key={url} className="relative">
                      <img
                        src={url}
                        alt={`Product preview ${idx + 1}`}
                        className="h-24 w-24 rounded-xl border border-gray-200 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrls(imageUrls.filter((u) => u !== url))}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-600 hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={useVariants}
                  onChange={(event) => setUseVariants(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-orange-500"
                />
                This product has variants (different colors/sizes/prices)
              </label>
            </div>
            {!useVariants ? (
              <>
                <div>
                  <label className={labelClass}>Price (GHS)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className={inputClass}
                    placeholder="0.00"
                  />
                  <p className="mt-1 text-xs text-gray-400">Listed price adds 10% automatically.</p>
                  {listedPricePreview != null && (
                    <p className="mt-0.5 text-xs font-medium text-gray-600">
                      You enter: GHS {parsedPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} · Listed:{' '}
                      GHS {listedPricePreview.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Stock</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(event) => setStock(event.target.value)}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
              </>
            ) : (
              <div className="md:col-span-2 rounded-xl border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">Variants</p>
                  <button
                    type="button"
                    onClick={addVariantRow}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Variant
                  </button>
                </div>
                <div className="space-y-3">
                  {variants.map((variant, index) => (
                    <div key={`${variant.id ?? 'new'}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="grid gap-3 md:grid-cols-6">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">Color</label>
                          <input
                            value={variant.color}
                            onChange={(event) => updateVariantRow(index, 'color', event.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">Size</label>
                          <input
                            value={variant.size}
                            onChange={(event) => updateVariantRow(index, 'size', event.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">SKU</label>
                          <input
                            value={variant.sku}
                            onChange={(event) => updateVariantRow(index, 'sku', event.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">Price (GHS)</label>
                          <input
                            type="number"
                            value={variant.price}
                            onChange={(event) => updateVariantRow(index, 'price', event.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                          />
                          {variantPricePreview[index] != null && (
                            <p className="mt-0.5 text-[11px] text-gray-400">
                              Listed: GHS {Number(variantPricePreview[index]).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">Stock</label>
                          <input
                            type="number"
                            value={variant.stock}
                            onChange={(event) => updateVariantRow(index, 'stock', event.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                          />
                        </div>
                        <div className="flex items-end gap-2 pb-1">
                          <label className="inline-flex items-center gap-1 text-xs text-gray-600">
                            <input
                              type="radio"
                              checked={variant.is_default}
                              onChange={() => setDefaultVariant(index)}
                              className="accent-orange-500"
                            />
                            Default
                          </label>
                          <button
                            type="button"
                            onClick={() => removeVariantRow(index)}
                            className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
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
                            className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            Remove image
                          </button>
                        )}
                      </div>
                      {variant.image_url && (
                        <img
                          src={variant.image_url}
                          alt="Variant preview"
                          className="mt-2 h-20 w-20 rounded-xl border border-gray-200 object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className={labelClass}>Shop</label>
              <select
                value={shopId}
                onChange={(event) => setShopId(event.target.value)}
                className={inputClass}
              >
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={inputClass}
              >
                {categories.map((item) => (
                  <option key={item.slug} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as ShopProduct['status'])}
                className={inputClass}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="sold_out">Sold out</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Delivery Type</label>
              <p className="text-xs text-gray-400 mb-2">This determines the delivery options available to buyers at checkout.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className={`flex-1 flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${!requiresCargo ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-100' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="delivery_type" checked={!requiresCargo} onChange={() => setRequiresCargo(false)} className="mt-0.5 accent-orange-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Standard</p>
                    <p className="text-xs text-gray-500">Fits in a backpack or small box (under 10kg)</p>
                  </div>
                </label>
                <label className={`flex-1 flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${requiresCargo ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-100' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="delivery_type" checked={requiresCargo} onChange={() => setRequiresCargo(true)} className="mt-0.5 accent-orange-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Cargo</p>
                    <p className="text-xs text-gray-500">Large, heavy or bulky item (furniture, appliances, over 10kg)</p>
                  </div>
                </label>
              </div>
            </div>
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className={labelClass}>Description</label>
                <button
                  type="button"
                  onClick={generateDescriptionWithAi}
                  disabled={aiDescriptionLoading || imageUrls.length === 0}
                  className="rounded-xl bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
                >
                  {aiDescriptionLoading ? 'Generating…' : description.trim() ? '✨ Improve with AI' : '✨ Generate with AI'}
                </button>
              </div>
              {aiDescriptionError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-600">
                  Couldn&apos;t generate description. Please write one manually.
                </div>
              )}
              {descriptionGeneratedByAi && !aiDescriptionError && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-2 text-xs text-blue-600">
                  AI-generated — please review before publishing
                </div>
              )}
              <textarea
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value)
                  setDescriptionGeneratedByAi(false)
                }}
                rows={4}
                className={inputClass}
                placeholder="Describe your product…"
              />
            </div>
          </div>

          <button
            onClick={submitProduct}
            disabled={saving}
            className="mt-5 rounded-xl bg-orange-500 px-6 py-2.5 font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Saving…' : formMode === 'edit' ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      )}

      {/* Detail modal */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-base font-bold text-gray-900">Product Details</h3>
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {(detailProduct.image_urls?.[0] ?? detailProduct.image_url) && (
              <img
                src={detailProduct.image_urls?.[0] ?? detailProduct.image_url ?? ''}
                alt={detailProduct.title}
                className="mb-4 h-40 w-full rounded-xl border border-gray-100 object-cover"
              />
            )}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Title</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">{detailProduct.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Shop</p>
                  <p className="mt-0.5 text-sm text-gray-700">
                    {shops.find((s) => s.id === detailProduct.shop_id)?.name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Category</p>
                  <p className="mt-0.5 text-sm text-gray-700">{detailProduct.category}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Created</p>
                  <p className="mt-0.5 text-xs text-gray-700">
                    {detailProduct.created_at ? new Date(detailProduct.created_at).toLocaleString() : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Status</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      STATUS_BADGE[detailProduct.status] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {detailProduct.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  openEditForm(detailProduct)
                  setDetailProduct(null)
                }}
                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Edit Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
