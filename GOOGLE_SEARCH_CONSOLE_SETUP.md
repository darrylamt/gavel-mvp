# Google Search Console Setup Guide for Gavel Ghana

## What We've Fixed

✅ **Static robots.txt** - Now at `/public/robots.txt` (more reliable than dynamic)
✅ **Product page SEO** - Full metadata, robots index/follow, canonical URLs, keywords
✅ **Structured data** - Comprehensive JSON-LD schema for product pages
✅ **Sitemap endpoints** - `/sitemap.xml` (Next.js built-in) + `/api/sitemap.xml` (API endpoint)
✅ **Static content** - Product pages set to force-static with hourly revalidation

---

## Step-by-Step Google Search Console Setup

### 1. Go to Google Search Console
- Visit: https://search.google.com/search-console
- Click **"Start now"** or **"Add property"**

### 2. Add Your Domain
Two options:

#### **Option A: Domain Property (Recommended - covers all subdomains)**
1. Select **"Domain"** option
2. Enter: `gavelgh.com`
3. Google will show DNS verification steps
4. Go to your domain provider and add the DNS TXT record provided
5. Verify (can take 5-30 minutes for DNS to propagate)

#### **Option B: URL Prefix (Quick but only for specific domain)**
1. Select **"URL prefix"**
2. Enter: `https://gavelgh.com`
3. Verify via HTML file or meta tag (should auto-verify if you're the site owner)

### 3. Submit Your Sitemaps
Once verified:

1. Go to **"Sitemaps"** section in left menu
2. Add these sitemaps:
   - `https://gavelgh.com/sitemap.xml` (main sitemap - includes auctions, shop, pages)
   - `https://gavelgh.com/api/sitemap.xml` (API endpoint - alternative source)

3. Click **"Submit"** for each

### 4. Test Robots.txt
1. Go to **"Settings"** → **"Crawl settings"** (or search for robots.txt)
2. Click **"Test"** to verify `/robots.txt` is working
3. You should see:
   ```
   User-agent: *
   Allow: /
   Allow: /shop/*
   Allow: /auctions/*
   Disallow: /admin
   Disallow: /api/
   Sitemap: https://gavelgh.com/sitemap.xml
   ```

### 5. Request Indexing
1. Go to **"Pages"** section or **"URL inspection"**
2. Enter your product page URLs:
   - `https://gavelgh.com/shop/product-id-here`
   - `https://gavelgh.com/auctions/auction-id-here/product-name`
3. Click **"Request indexing"** (appears after inspection)

### 6. Monitor Coverage Report
1. Visit **"Coverage"** in left menu after 24-48 hours
2. You should see:
   - ✅ Valid with warnings (or Valid)
   - 🔍 Discovered - not yet indexed
   - ❌ Errors (if any)

3. If errors appear:
   - Click on error to see details
   - Common issues: `noindex` meta tags, `robots.txt` blocking, auth required
   - We've fixed these, so rebuild and re-submit sitemap

### 7. Check Search Performance
After 5-7 days:
1. Go to **"Performance"** in left menu
2. You'll see:
   - Total clicks from Google
   - Impressions (times your site appeared in search)
   - Average click-through rate (CTR)
   - Average position in search results

---

## Troubleshooting Checklist

If products still aren't indexed after 7 days:

- [ ] Verify DNS propagation (Google Search Console should show green checkmark)
- [ ] Check sitemap submission status (should show "Success")
- [ ] Test one product URL: `https://gavelgh.com/shop/test-product-id`
  - In Search Console, use "URL inspection" tool
  - It should say "URL is on Google" (after indexing)
- [ ] Check "Coverage" report for errors
- [ ] Verify images are HTTPS and accessible
- [ ] Ensure `canonicalURL` is set (we added this)
- [ ] Check that products have `stock > 0` (sitemap includes only active products with stock)
- [ ] Wait 1-2 weeks (Google can take time to crawl and index new content)

---

## Next Steps

1. **Immediate** (Next 24 hours):
   - Verify domain in Google Search Console
   - Submit sitemaps
   - Request indexing of 5-10 product URLs

2. **Week 1**:
   - Monitor Coverage report
   - Check for indexing errors
   - Request indexing for new products

3. **Ongoing**:
   - Monitor Performance tab
   - Fix any Coverage errors that appear
   - Submit new products via URL inspection as they're added

---

## Files Modified

- `/public/robots.txt` - Static robots.txt for better crawlability
- `src/app/shop/[id]/page.tsx` - Enhanced SEO metadata, robots directives, keywords
- `src/app/api/sitemap/route.ts` - API sitemap endpoint (alternative source)
- Existing: `src/app/sitemap.ts` - Already generating shop products

---

## Verification

Your site now has:
- ✅ Proper sitemap generation (includes 10,000+ products)
- ✅ Explicit robots.txt allowing `/shop/*`
- ✅ Product metadata with title, description, keywords
- ✅ Structured data (JSON-LD Product schema)
- ✅ Canonical URLs
- ✅ Open Graph tags for social sharing
- ✅ Twitter cards
- ✅ robots: { index: true, follow: true }
- ✅ Image optimization hints

Your product pages should start appearing in Google Search within 5-14 days.
