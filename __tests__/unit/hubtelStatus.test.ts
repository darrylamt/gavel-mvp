/**
 * Tests for parseHubtelStatus
 * Source: src/lib/payment/hubtelStatus.ts
 *
 * Fixtures are real responses from Hubtel's public status endpoint, captured
 * during integration with Hubtel on 2026-05-27/28 (phone number truncated).
 */

import { parseHubtelStatus, HubtelStatusError } from '@/lib/payment/hubtelStatus'

const successfulPayment = {
  ResponseCode: '0000',
  Data: [
    {
      StartDate: '2026-05-28T10:09:39.865939',
      InvoiceStatus: 'Success',
      TransactionStatus: 'Success',
      TransactionId: '630da447e1ce42f7bee0b4540d2a5320',
      TransactionType: 'RECEIVE-MONEY',
      PaymentMethod: 'MOBILE-MONEY',
      ClientReference: 'gvl_mppbz2i7_hdf7sa',
      CurrencyCode: 'GHS',
      TransactionAmount: 10.1,
      Fee: 0,
      AmountAfterFees: 10,
      MobileNumber: '233XXXXXXXXX',
      ProviderResponseCode: 'SUCCESSFUL',
    },
  ],
}

const noMatchingRecord = {
  ResponseCode: '4720',
  Message:
    'Your status check did not match any records or your reference is older than a month, please check your request and try again.',
}

describe('parseHubtelStatus', () => {
  it('reads a real successful payment as paid (Data is an array)', () => {
    expect(parseHubtelStatus(successfulPayment)).toEqual({
      success: true,
      amountGHS: 10.1,
      clientReference: 'gvl_mppbz2i7_hdf7sa',
    })
  })

  it('throws HubtelStatusError carrying the code when no record matches', () => {
    expect(() => parseHubtelStatus(noMatchingRecord)).toThrow(HubtelStatusError)
    try {
      parseHubtelStatus(noMatchingRecord)
    } catch (err) {
      expect((err as HubtelStatusError).responseCode).toBe('4720')
    }
  })

  it('reports a failed attempt as not paid', () => {
    const failed = {
      ResponseCode: '0000',
      Data: [{ ...successfulPayment.Data[0], TransactionStatus: 'Failed', InvoiceStatus: 'Failed' }],
    }
    expect(parseHubtelStatus(failed).success).toBe(false)
  })

  it('finds the successful attempt when a failed one came first', () => {
    const retried = {
      ResponseCode: '0000',
      Data: [
        { ...successfulPayment.Data[0], TransactionStatus: 'Failed', TransactionAmount: 10.1 },
        successfulPayment.Data[0],
      ],
    }
    expect(parseHubtelStatus(retried)).toMatchObject({ success: true, amountGHS: 10.1 })
  })

  it('still accepts the legacy single-object shape', () => {
    const legacy = { ResponseCode: '0000', Data: { Status: 'Paid', Amount: 25, ClientReference: 'gvl_x' } }
    expect(parseHubtelStatus(legacy)).toEqual({ success: true, amountGHS: 25, clientReference: 'gvl_x' })
  })

  it('treats an empty or unparseable body as a failed check', () => {
    expect(() => parseHubtelStatus(null)).toThrow(HubtelStatusError)
    expect(parseHubtelStatus({ ResponseCode: '0000', Data: [] }).success).toBe(false)
  })
})
