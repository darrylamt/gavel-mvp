'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTopToast } from '@/components/ui/TopToastProvider'
import { useAuthUser } from '@/hooks/useAuthUser'

type ProductReview = {
  rating: number
  title: string | null
  body: string | null
  created_at: string
  reviewer_name: string | null
}

type Props = {
  productId: string
  reviews: ProductReview[]
}

export default function ProductReviewsSection({ productId, reviews }: Props) {
  const { user } = useAuthUser()
  const { notify } = useTopToast()

  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reviewCount = reviews.length
  const averageRating =
    reviewCount > 0 ? Number((reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviewCount).toFixed(1)) : null

  const submitReview = async () => {
    if (!user) {
      notify({ title: 'Sign in required', description: 'Please sign in to submit a review.', variant: 'warning' })
      return
    }

    if (!body.trim()) {
      notify({ title: 'Review required', description: 'Please write your review before submitting.', variant: 'warning' })
      return
    }

    setSubmitting(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) {
        notify({ title: 'Sign in required', description: 'Please sign in to submit a review.', variant: 'warning' })
        return
      }

      const res = await fetch('/api/shop-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: productId,
          rating,
          title,
          body,
        }),
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        notify({ title: 'Could not submit', description: payload?.error || 'Failed to submit review.', variant: 'error' })
        return
      }

      setTitle('')
      setBody('')
      setRating(5)
      notify({
        title: 'Review submitted',
        description: 'Your review has been sent for admin approval.',
        variant: 'success',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Customer Reviews</h2>
          <p className="mt-1 text-sm text-gray-600">Reviews from buyers for this product.</p>
        </div>
        {averageRating !== null && (
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{averageRating} / 5</p>
            <p className="text-sm text-gray-600">{reviewCount} review{reviewCount === 1 ? '' : 's'}</p>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="pt-4 text-sm text-gray-600">No approved reviews yet.</p>
      ) : (
        <div className="space-y-4 pt-4">
          {reviews.map((review, index) => (
            <article key={`${review.created_at}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{review.reviewer_name || 'Verified buyer'}</p>
                <p className="text-sm text-amber-600">{'★'.repeat(Math.max(1, Math.min(5, review.rating)))}</p>
              </div>
              {review.title && <p className="mt-2 text-sm font-medium text-gray-900">{review.title}</p>}
              {review.body && <p className="mt-1 text-sm leading-relaxed text-gray-700">{review.body}</p>}
            </article>
          ))}
        </div>
      )}

      <div className="mt-6 border-t border-gray-200 pt-4">
        <h3 className="text-base font-semibold text-gray-900">Write a review</h3>
        <p className="mt-1 text-xs text-gray-500">Reviews are submitted for admin approval before appearing publicly.</p>

        <div className="mt-4 grid gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Rating</label>
            <select
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value={5}>5 - Excellent</option>
              <option value={4}>4 - Good</option>
              <option value={3}>3 - Average</option>
              <option value={2}>2 - Poor</option>
              <option value={1}>1 - Very poor</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title (optional)</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Short summary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Review</label>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Share your experience"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={submitReview}
              disabled={submitting}
              className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
