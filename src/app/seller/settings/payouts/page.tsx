'use client'

import { useEffect, useState } from 'react'
import { supabase, getSessionHeaders } from '@/lib/supabaseClient'
import { Trash2, Check } from 'lucide-react'

type Bank = {
  id: number
  name: string
  code: string
}

type PayoutAccount = {
  id: string
  account_type: 'bank' | 'momo'
  account_name: string
  account_number: string
  bank_code: string | null
  network_code: string | null
  is_default: boolean
  created_at: string
}

const MOMO_NETWORKS = [
  { code: 'MTN', name: 'MTN Mobile Money' },
  { code: 'VOD', name: 'Vodafone Cash' },
  { code: 'ATL', name: 'AirtelTigo Money' },
]

export default function PayoutSettingsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<PayoutAccount[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [accountType, setAccountType] = useState<'bank' | 'momo'>('bank')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [networkCode, setNetworkCode] = useState('MTN')
  const [isDefault, setIsDefault] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)
      await loadAccounts(user.id)
      await loadBanks()
      setLoading(false)
    }

    init()
  }, [])

  const loadAccounts = async (uid: string) => {
    try {
      const res = await fetch(`/api/payouts/recipient?seller_id=${uid}`)
      const data = await res.json()

      if (res.ok && data.data) {
        setAccounts(data.data)
      } else {
        setError(data.error || 'Failed to load payout accounts')
      }
    } catch (err) {
      setError('Failed to load payout accounts')
    }
  }

  const loadBanks = async () => {
    try {
      const res = await fetch('/api/payouts/banks')
      const data = await res.json()

      if (res.ok && data.data) {
        setBanks(data.data)
      }
    } catch (err) {
      console.error('Failed to load banks:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const headers = await getSessionHeaders()
      const res = await fetch('/api/payouts/recipient', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seller_id: userId,
          account_type: accountType,
          account_name: accountName,
          account_number: accountNumber,
          bank_code: accountType === 'bank' ? bankCode : undefined,
          network_code: accountType === 'momo' ? networkCode : undefined,
          is_default: isDefault || accounts.length === 0, // First account is default
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess('Payout account added successfully')
        await loadAccounts(userId)
        resetForm()
      } else {
        setError(data.error || 'Failed to add payout account')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payout account')
    } finally {
      setSaving(false)
    }
  }

  const setAsDefault = async (accountId: string) => {
    if (!userId) return

    setError(null)
    setSuccess(null)

    try {
      const headers = await getSessionHeaders()
      const res = await fetch('/api/payouts/recipient', {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: accountId,
          seller_id: userId,
          is_default: true,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess('Default account updated')
        await loadAccounts(userId)
      } else {
        setError(data.error || 'Failed to update default account')
      }
    } catch (err) {
      setError('Failed to update default account')
    }
  }

  const deleteAccount = async (accountId: string) => {
    if (!userId || !confirm('Are you sure you want to delete this payout account?')) return

    setError(null)
    setSuccess(null)

    try {
      const headers = await getSessionHeaders()
      const res = await fetch(`/api/payouts/recipient?account_id=${accountId}&seller_id=${userId}`, {
        method: 'DELETE',
        headers,
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess('Payout account deleted')
        await loadAccounts(userId)
      } else {
        setError(data.error || 'Failed to delete payout account')
      }
    } catch (err) {
      setError('Failed to delete payout account')
    }
  }

  const resetForm = () => {
    setAccountType('bank')
    setAccountName('')
    setAccountNumber('')
    setBankCode('')
    setNetworkCode('MTN')
    setIsDefault(false)
    setShowForm(false)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-gray-600">Loading payout settings...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payout Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your payout accounts for receiving payments from sales.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {success}
        </div>
      )}

      {/* Info box */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-blue-900">How Payouts Work</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• When a buyer completes payment, funds are held in escrow for 5 days</li>
          <li>• Payouts release immediately when buyer confirms delivery, or automatically after 5 days</li>
          <li>• For auctions: You receive 90% of final bid (10% commission)</li>
          <li>• For shop items: You receive your listed price (10% commission already included)</li>
          <li>• Set up at least one payout account to receive payments</li>
        </ul>
      </div>

      {/* Existing accounts */}
      {accounts.length > 0 && (
        <div className="mb-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Your Payout Accounts</h2>
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{account.account_name}</p>
                  {account.is_default && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                      <Check className="h-3 w-3" />
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {account.account_type === 'bank' ? 'Bank Account' : 'Mobile Money'} •{' '}
                  {account.account_number}
                  {account.account_type === 'momo' && ` • ${account.network_code}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!account.is_default && (
                  <button
                    onClick={() => setAsDefault(account.id)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Set as Default
                  </button>
                )}
                <button
                  onClick={() => deleteAccount(account.id)}
                  className="rounded-lg border border-red-300 bg-red-50 p-2 text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new account */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Add Payout Account
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Add New Payout Account</h2>

          {/* Account type selector */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">Account Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="bank"
                  checked={accountType === 'bank'}
                  onChange={() => setAccountType('bank')}
                  className="h-4 w-4"
                />
                <span className="text-sm">Bank Account</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="momo"
                  checked={accountType === 'momo'}
                  onChange={() => setAccountType('momo')}
                  className="h-4 w-4"
                />
                <span className="text-sm">Mobile Money</span>
              </label>
            </div>
          </div>

          {/* Account name */}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Account Holder Name *
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Full name as it appears on account"
            />
          </div>

          {/* Account number / Phone */}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {accountType === 'bank' ? 'Account Number' : 'Mobile Money Number'} *
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder={accountType === 'bank' ? '1234567890' : '0241234567'}
            />
          </div>

          {/* Bank selector (for bank accounts) */}
          {accountType === 'bank' && (
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Bank *</label>
              <select
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select a bank</option>
                {banks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Network selector (for mobile money) */}
          {accountType === 'momo' && (
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Network *</label>
              <select
                value={networkCode}
                onChange={(e) => setNetworkCode(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {MOMO_NETWORKS.map((network) => (
                  <option key={network.code} value={network.code}>
                    {network.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Set as default checkbox */}
          {accounts.length > 0 && (
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm text-gray-700">Set as default payout account</span>
              </label>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Account'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
