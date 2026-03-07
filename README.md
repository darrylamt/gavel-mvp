This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Arkesel SMS Notifications Setup

Run the latest Supabase migrations so SMS tables/columns exist:

```bash
# Apply migrations with your existing workflow
```

Set these environment variables:

- `ARKESEL_ENABLED=true`
- `ARKESEL_API_KEY=<your-gavel-api-key-from-dashboard>`
- `ARKESEL_SENDER_ID=Gavel` (optional, defaults to "Gavel")
- `ARKESEL_DEFAULT_COUNTRY_CODE=233` (Ghana)
- `ARKESEL_DISPATCH_SECRET=gavel-sms-dispatch-7f3a9c2e1b4d6k8h` (or use `CRON_SECRET`)

Cron endpoint (supports both GET and POST):

- `/api/arkesel/dispatch` (deliver queued SMS messages)
- `/api/arkesel/auction-countdown` (check auctions and send countdown notifications to bidders)

Call with either:
- Query param: `GET https://gavelgh.com/api/arkesel/dispatch?secret=gavel-sms-dispatch-7f3a9c2e1b4d6k8h`
- Header: `Authorization: Bearer gavel-sms-dispatch-7f3a9c2e1b4d6k8h`

Recommended schedule:

- `dispatch`: every minute
- `auction-countdown`: every 5 minutes

**Note:** Uses Arkesel SMS API v2 with JSON body format. Phone numbers are automatically formatted to `233XXXXXXXXX` format.

## Auction Countdown Notifications

Bidders automatically receive SMS notifications at:
- ⏰ 10 hours before auction ends
- ⏰ 5 hours before auction ends
- ⏰ 1 hour before auction ends
- ⏰ 30 minutes before auction ends
- ⏰ 5 minutes before auction ends

Users can customize these preferences at `/profile/notifications`

## Resend Broadcast + Contacts Setup

Set these environment variables:

- `RESEND_API_KEY=<your_resend_api_key>`
- `RESEND_BROADCAST_SEGMENT_ID=<your_resend_segment_id>`
- `RESEND_BROADCAST_FROM=Gavel Ghana <notifications@gavelghana.com>`

Admin-only API endpoints (require `Authorization: Bearer <admin_user_token>`):

- `POST /api/admin/resend/contacts` create contact
- `GET /api/admin/resend/contacts?id=...` or `?email=...` get contact
- `PATCH /api/admin/resend/contacts` update contact by `id` or `email`
- `DELETE /api/admin/resend/contacts?id=...` or `?email=...` delete contact
- `GET /api/admin/resend/contacts?limit=20` list contacts
- `POST /api/admin/resend/contacts/sync` sync Supabase auth users to Resend contacts

- `POST /api/admin/resend/broadcasts` create broadcast
- `GET /api/admin/resend/broadcasts` list broadcasts
- `GET /api/admin/resend/broadcasts/{id}` retrieve broadcast
- `PATCH /api/admin/resend/broadcasts/{id}` update broadcast
- `DELETE /api/admin/resend/broadcasts/{id}` delete broadcast
- `POST /api/admin/resend/broadcasts/{id}/send` send or schedule broadcast

Admin page `/admin/broadcast` now uses Resend Broadcast flow (`create -> send`) instead of manual batch email loops.
