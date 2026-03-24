import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

export const handlers = [
  // ── Paystack ────────────────────────────────────────────────────────────────
  http.post('https://api.paystack.co/transaction/initialize', () =>
    HttpResponse.json({
      status: true,
      message: 'Authorization URL created',
      data: {
        authorization_url: 'https://checkout.paystack.com/mock',
        access_code: 'mock_access_code',
        reference: 'ref_test_mock123',
      },
    })
  ),

  http.get('https://api.paystack.co/transaction/verify/:reference', () =>
    HttpResponse.json({
      status: true,
      message: 'Verification successful',
      data: {
        status: 'success',
        reference: 'ref_test_mock123',
        amount: 10000,
        currency: 'GHS',
        metadata: {},
      },
    })
  ),

  http.post('https://api.paystack.co/transferrecipient', () =>
    HttpResponse.json({
      status: true,
      message: 'Transfer recipient created successfully',
      data: { recipient_code: 'RCP_mock123', type: 'mobile_money' },
    })
  ),

  http.post('https://api.paystack.co/transfer', () =>
    HttpResponse.json({
      status: true,
      message: 'Transfer initiated',
      data: {
        transfer_code: 'TRF_mock123',
        status: 'pending',
        amount: 9000,
      },
    })
  ),

  http.post('https://api.paystack.co/transfer/finalize_transfer', () =>
    HttpResponse.json({ status: true, message: 'Transfer finalized' })
  ),

  // ── Arkesel SMS ─────────────────────────────────────────────────────────────
  http.get('https://sms.arkesel.com/sms/api', () =>
    HttpResponse.json({ status: 'success', message: 'Successfully sent' })
  ),

  http.post('https://sms.arkesel.com/sms/api', () =>
    HttpResponse.json({ status: 'success', message: 'Successfully sent' })
  ),

  // ── Anthropic Claude ─────────────────────────────────────────────────────────
  http.post('https://api.anthropic.com/v1/messages', () =>
    HttpResponse.json({
      id: 'msg_mock',
      type: 'message',
      role: 'assistant',
      content: [
        { type: 'text', text: 'A high-quality product in excellent condition.' },
      ],
      model: 'claude-3-5-sonnet-latest',
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 30 },
    })
  ),

  // ── OpenAI Embeddings ────────────────────────────────────────────────────────
  http.post('https://api.openai.com/v1/embeddings', () =>
    HttpResponse.json({
      object: 'list',
      data: [{ object: 'embedding', index: 0, embedding: new Array(1536).fill(0.01) }],
      model: 'text-embedding-3-small',
      usage: { prompt_tokens: 8, total_tokens: 8 },
    })
  ),

  // ── OpenAI Chat (GPT fallback in ai/describe-product) ───────────────────────
  http.post('https://api.openai.com/v1/chat/completions', () =>
    HttpResponse.json({
      id: 'chatcmpl-mock',
      object: 'chat.completion',
      choices: [
        {
          message: { role: 'assistant', content: 'A well-maintained item, ready to use.' },
          finish_reason: 'stop',
          index: 0,
        },
      ],
      usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
    })
  ),
]

export const server = setupServer(...handlers)
