'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Zap } from 'lucide-react'
import AdminShell from '@/components/admin/AdminShell'
import { supabase } from '@/lib/supabaseClient'

type BackfillStatus = 'idle' | 'running' | 'success' | 'error'

type BackfillResult = {
  success: boolean
  batchesRun: number
  batchSize: number
  maxBatches: number
  auctions: {
    processed: number
    updated: number
    failed: number
    errors: string[]
  }
  products: {
    processed: number
    updated: number
    failed: number
    errors: string[]
  }
  remaining: {
    auctions: number
    products: number
  }
  error?: string
}

export default function AdminToolsPage() {
  const [activeTab, setActiveTab] = useState<'embeddings'>('embeddings')
  const [backfillStatus, setBackfillStatus] = useState<BackfillStatus>('idle')
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const runBackfill = async () => {
    setBackfillStatus('running')
    setIsRunning(true)
    setBackfillResult(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) {
        setBackfillStatus('error')
        setBackfillResult({
          success: false,
          batchesRun: 0,
          batchSize: 0,
          maxBatches: 0,
          auctions: { processed: 0, updated: 0, failed: 0, errors: ['Not authenticated'] },
          products: { processed: 0, updated: 0, failed: 0, errors: [] },
          remaining: { auctions: 0, products: 0 },
          error: 'Not authenticated',
        })
        return
      }

      const response = await fetch('/api/admin/embeddings/backfill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          batchSize: 50,
          maxBatches: 20,
        }),
      })

      const result: BackfillResult = await response.json()

      if (result.success) {
        setBackfillStatus('success')
      } else {
        setBackfillStatus('error')
      }

      setBackfillResult(result)
    } catch (error) {
      setBackfillStatus('error')
      setBackfillResult({
        success: false,
        batchesRun: 0,
        batchSize: 0,
        maxBatches: 0,
        auctions: { processed: 0, updated: 0, failed: 0, errors: [] },
        products: { processed: 0, updated: 0, failed: 0, errors: [] },
        remaining: { auctions: 0, products: 0 },
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <AdminShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Tools</h1>
          <p className="mt-1 text-sm text-gray-600">Manage platform operations and maintenance tasks</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-white rounded-t-2xl">
          <div className="flex h-14 items-center gap-8 px-6">
            <button
              onClick={() => setActiveTab('embeddings')}
              className={`text-sm font-medium transition ${
                activeTab === 'embeddings'
                  ? 'border-b-2 border-black text-black'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Embeddings
            </button>
          </div>
        </div>

        {/* Embeddings Tab */}
        {activeTab === 'embeddings' && (
          <div className="space-y-4 rounded-b-2xl bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Semantic Search Embeddings</h2>
              <p className="text-sm text-gray-600 mb-4">
                Generate embeddings for all auctions and products missing them. This enables semantic search functionality.
              </p>
            </div>

            {/* Status Alert */}
            {backfillResult && (
              <div
                className={`rounded-lg border p-4 ${
                  backfillStatus === 'success'
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {backfillStatus === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className={`font-semibold ${backfillStatus === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                      {backfillStatus === 'success' ? 'Backfill Completed' : 'Backfill Failed'}
                    </h3>

                    {backfillResult.success && (
                      <div className="mt-2 text-sm text-gray-700 space-y-1">
                        <p>
                          <strong>Batches Run:</strong> {backfillResult.batchesRun}
                        </p>
                        <p>
                          <strong>Auctions:</strong> {backfillResult.auctions.processed} processed, {backfillResult.auctions.updated} updated,{' '}
                          {backfillResult.auctions.failed} failed
                        </p>
                        <p>
                          <strong>Products:</strong> {backfillResult.products.processed} processed, {backfillResult.products.updated} updated,{' '}
                          {backfillResult.products.failed} failed
                        </p>
                        <p>
                          <strong>Remaining:</strong> {backfillResult.remaining.auctions} auctions, {backfillResult.remaining.products} products
                        </p>
                      </div>
                    )}

                    {!backfillResult.success && (
                      <div className="mt-2 text-sm text-gray-700">
                        <p>{backfillResult.error || 'An error occurred'}</p>
                        {backfillResult.auctions.errors.length > 0 && (
                          <div className="mt-2">
                            <p className="font-medium">Auction errors:</p>
                            <ul className="mt-1 list-inside list-disc text-xs">
                              {backfillResult.auctions.errors.slice(0, 3).map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {backfillResult.products.errors.length > 0 && (
                          <div className="mt-2">
                            <p className="font-medium">Product errors:</p>
                            <ul className="mt-1 list-inside list-disc text-xs">
                              {backfillResult.products.errors.slice(0, 3).map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={runBackfill}
                disabled={isRunning}
                className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Run Backfill
                  </>
                )}
              </button>
              <p className="text-xs text-gray-600">Generates up to 1000 embeddings per run (50 per batch, 20 batches max)</p>
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900">
              <p className="font-medium mb-1">💡 About Embeddings</p>
              <p>
                Embeddings convert auction titles, descriptions, and products into vectors for semantic search. This allows users to search by meaning, not just keywords.
                The system auto-generates embeddings when new listings are created. Use this tool to backfill embeddings for existing listings.
              </p>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
