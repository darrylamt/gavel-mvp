# Mobile Auction UI Design (iOS + Android)

This design follows a clean, card-first commerce pattern inspired by the provided reference screens.

## 1) Auction Card System

### Primary Auction Card (horizontal carousel)
- Width: ~270
- Top media block with category chip + countdown pill
- Title (2 lines max)
- Current bid (primary price)
- Optional buy-now price
- Footer: condition + watcher count

### Compact Auction Card (list view)
- Full-width variant of the same card component
- Used in `Live Auctions` screen for vertical browsing

## 2) Auction Pages

### Auctions List Page
- Header: `Live Auctions` + short supporting text
- Vertical list of compact auction cards
- Focus on quick scanning of timer, current bid, bid volume

### Auction Detail Page
- Hero media area with category and time-left chips
- Price card with current bid + bid count
- Seller, condition, watcher engagement sections
- Action area:
  - Primary: `Place Bid`
  - Secondary: `Buy Now` (if available)

## 3) Marketplace Home Design

- Greeting/header with user identity and `Live` shortcut button
- Search field with rounded border
- Horizontal category chips
- `Ending Soon` horizontal auction rail
- `Popular Products` two-column product grid

## 4) Auth + Profile + Orders Styling

- Strong typographic hierarchy (large headings)
- Rounded card containers and soft border lines
- Dark primary CTA buttons with pill corners
- Neutral light backgrounds for platform-consistent iOS/Android feel
- Profile and orders redesigned as card sections instead of plain rows

## 5) Implementation References

- `apps/mobile/src/components/auction/AuctionCard.tsx`
- `apps/mobile/src/components/auction/ProductCard.tsx`
- `apps/mobile/app/(tabs)/auctions.tsx`
- `apps/mobile/app/auction/[id].tsx`
- `apps/mobile/app/(tabs)/index.tsx`
