import 'server-only'

/**
 * Paystack Transfer API utility for seller payouts
 * Handles transfers to bank accounts and mobile money accounts in Ghana
 */

export interface PaystackBankAccount {
  type: 'ghipss'
  name: string
  account_number: string
  bank_code: string
  currency: 'GHS'
}

export interface PaystackMobileMoneyAccount {
  type: 'mobile_money'
  name: string
  account_number: string
  bank_code: 'MTN' | 'VOD' | 'ATL'
  currency: 'GHS'
}

export type PaystackRecipientPayload = PaystackBankAccount | PaystackMobileMoneyAccount

export interface PaystackRecipientResponse {
  status: boolean
  message: string
  data?: {
    recipient_code: string
    type: string
    name: string
    description: string | null
    domain: string
    currency: string
    metadata: Record<string, unknown>
    details: {
      authorization_code: string | null
      account_number: string
      account_name: string | null
      bank_code: string
      bank_name: string
    }
  }
}

export interface PaystackTransferPayload {
  source: 'balance'
  amount: number // in pesewas (GHS * 100)
  recipient: string // recipient_code
  reason: string
  reference: string // unique reference for idempotency
}

export interface PaystackTransferResponse {
  status: boolean
  message: string
  data?: {
    transfer_code: string
    reference: string
    recipient: string
    amount: number
    currency: string
    status: string
    domain: string
    reason: string
    failures: null | unknown
    created_at: string
    updated_at: string
  }
}

export interface PaystackBankListResponse {
  status: boolean
  message: string
  data?: Array<{
    id: number
    name: string
    slug: string
    code: string
    longcode: string
    gateway: string | null
    pay_with_bank: boolean
    active: boolean
    country: string
    currency: string
    type: string
  }>
}

/**
 * Create a transfer recipient on Paystack
 * This must be done before initiating transfers
 */
export async function createTransferRecipient(
  payload: PaystackRecipientPayload
): Promise<PaystackRecipientResponse> {
  const response = await fetch('https://api.paystack.co/transferrecipient', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data: PaystackRecipientResponse = await response.json()

  if (!data.status) {
    throw new Error(data.message || 'Failed to create transfer recipient')
  }

  return data
}

/**
 * Initiate a transfer to a seller
 * Amount should be in pesewas (GHS * 100)
 */
export async function initiateTransfer(
  recipientCode: string,
  amount: number, // in GHS (will be converted to pesewas)
  reason: string,
  reference: string
): Promise<PaystackTransferResponse> {
  const payload: PaystackTransferPayload = {
    source: 'balance',
    amount: Math.round(amount * 100), // convert to pesewas
    recipient: recipientCode,
    reason,
    reference,
  }

  const response = await fetch('https://api.paystack.co/transfer', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data: PaystackTransferResponse = await response.json()

  if (!data.status) {
    throw new Error(data.message || 'Failed to initiate transfer')
  }

  return data
}

/**
 * Get list of banks for Ghana
 */
export async function getGhanaBanks(): Promise<PaystackBankListResponse> {
  const response = await fetch(
    'https://api.paystack.co/bank?currency=GHS&type=ghipss',
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  )

  const data: PaystackBankListResponse = await response.json()

  if (!data.status) {
    throw new Error(data.message || 'Failed to fetch banks')
  }

  return data
}

/**
 * Verify a transfer status
 */
export async function verifyTransfer(reference: string) {
  const response = await fetch(
    `https://api.paystack.co/transfer/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  )

  const data = await response.json()

  if (!data.status) {
    throw new Error(data.message || 'Failed to verify transfer')
  }

  return data
}
