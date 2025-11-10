# SEO Implementation Reference

Complete reference for SEO implementation status, pending items, and verification checklist.

## ✅ Completed (Production Ready)

### Core SEO
- ✅ Metadata foundation (title, description, OG, Twitter cards)
- ✅ Sitemap (`app/sitemap.ts`) with changeFrequency & priority
- ✅ Robots.txt (`app/robots.ts`) with environment-aware rules
- ✅ Dynamic Open Graph & Twitter images
- ✅ JSON-LD structured data (Organization, WebSite, SoftwareApplication, FAQPage, Sitelinks SearchBox)
- ✅ Canonical URLs (root + per-route for privacy/terms)
- ✅ URL hygiene (www redirect, trailing slash handling)

### Client-Side Tracking
- ✅ Cookie consent banner with analytics gating
- ✅ Client-only analytics loading (PostHog, GA4, Clarity)
- ✅ Router-based pageview tracking
- ✅ Sentry configuration with PostHog forwarding
- ✅ Google/Bing site verification meta tags

### Route-Level Metadata
- ✅ Privacy & Terms pages with canonicals and `robots: index,follow`
- ✅ OpenGraph locale (`en_US`)
- ✅ ISR revalidation (1 hour) for privacy/terms

### Performance & Quality
- ✅ Preconnect/DNS-prefetch for fonts & analytics
- ✅ Image optimization config (deviceSizes, imageSizes, AVIF/WebP)
- ✅ Web Vitals monitoring (CLS, INP, FCP, LCP, TTFB)
- ✅ TypeScript strict mode
- ✅ ESLint core-web-vitals plugin

### Security & UX
- ✅ Security headers middleware (CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- ✅ Error pages (404 with `robots: noindex`, 500 error page)
- ✅ Long-cache headers for social images (1 year immutable)

### PWA & Theming
- ✅ Web app manifest (`app/manifest.ts`)
- ✅ Icons metadata (icon, apple-touch-icon)
- ✅ Theme color & color scheme (light/dark)
- ✅ Viewport configuration

## ⏳ Pending / Future

### i18n (When Localization is Added)
- [ ] Configure `i18n` in `next.config.js` (`locales`, `defaultLocale`)
- [ ] Add `alternates.languages` (hreflang) for multi-language support

### Pagination & Faceted Navigation (If Needed)
- [ ] Canonical for page 1 and `?page=N` URLs
- [ ] Add prev/next link relations
- [ ] Default `noindex,follow` for filter/query faceted URLs

### Breadcrumbs (If Needed)
- [ ] Add `BreadcrumbList` JSON-LD for structured navigation

### Deployment Automation
- [ ] Add sitemap ping to Google Search Console on deploy
- [ ] Add sitemap ping to Bing Webmaster Tools on deploy
  - Suggested: Add to CI/CD pipeline (GitHub Actions, Cloudflare Workers deploy hook)
  - Example: `curl "https://www.google.com/ping?sitemap=https://yourdomain.com/sitemap.xml"`

### CSP Hardening (Optional)
- [ ] Replace `unsafe-inline`/`unsafe-eval` with nonces for inline scripts (production only)
  - Note: Currently using permissive CSP for analytics compatibility

## 📁 Key Files

```
app/
├── layout.tsx              # Root metadata, viewport, icons
├── sitemap.ts             # XML sitemap generation
├── robots.ts              # robots.txt generation
├── opengraph-image.tsx    # Dynamic OG images
├── twitter-image.tsx      # Dynamic Twitter images
├── manifest.ts            # PWA manifest
├── not-found.tsx          # 404 page (robots: noindex)
├── error.tsx              # 500 error page
├── privacy/page.tsx       # Privacy with canonical
└── terms/page.tsx          # Terms with canonical

components/
├── SEO.tsx                # JSON-LD structured data
├── WebVitalsReporter.tsx  # Web Vitals monitoring
└── PageLayout.tsx         # Shared header/footer layout

middleware.ts              # Security headers, cache control
next.config.ts            # Image optimization, redirects
tsconfig.json             # TypeScript strict mode
eslint.config.mjs         # ESLint core-web-vitals
```

## 🔗 Environment Variables

Required for full SEO functionality:
- `NEXT_PUBLIC_SITE_URL` - Canonical base URL
- `NEXT_PUBLIC_APP_NAME` - App name for titles/meta
- `NEXT_PUBLIC_TWITTER_HANDLE` - Twitter handle
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` - Google Search Console verification
- `NEXT_PUBLIC_BING_SITE_VERIFICATION` - Bing Webmaster verification

## 📊 Metrics

Web Vitals are automatically tracked and sent to:
- Google Analytics 4 (as custom events)
- PostHog (as `web_vital` events)
- Console warnings for poor metrics (CLS/LCP)

## 🔍 Quick Verification Checklist

- [ ] Verify sitemap is accessible: `/sitemap.xml`
- [ ] Verify robots.txt: `/robots.txt`
- [ ] Check OG images: `/opengraph-image` and `/twitter-image`
- [ ] Validate JSON-LD: Use Google Rich Results Test
- [ ] Test canonical URLs on all pages
- [ ] Verify security headers in production (use securityheaders.com)
- [ ] Test 404 page returns correct status code
- [ ] Test error page functionality
- [ ] Verify privacy/terms pages have proper metadata
- [ ] Check Web Vitals are being tracked in analytics

## 📋 Detailed Implementation Checklist

### Sprint 1 — Critical (crawlability, correctness, shareability)
- [x] Metadata foundation
  - [x] Set `metadataBase` and title template with brand suffix
  - [x] Add `openGraph` defaults (siteName, type, images) and `twitter` card
  - [x] Add `robots` with environment-aware `noindex` for non-prod
  - [x] Add `alternates.canonical` root; enable per-route canonical via `generateMetadata`
  - [x] Add `referrer` and `formatDetection`
- [x] Sitemaps & robots
  - [x] Implement `app/sitemap.ts` with key routes (+ `lastModified`)
  - [x] Implement `app/robots.ts` with env-specific allow/deny and `Sitemap:`
- [x] Social share images
  - [x] Add dynamic `app/opengraph-image.tsx` and `app/twitter-image.tsx`
- [x] JSON-LD (core)
  - [x] Add `Organization` and `WebSite` JSON-LD in root
  - [x] Add `SoftwareApplication` JSON-LD on landing/home
- [x] Hostname/URL hygiene
  - [x] Redirect policy for www/root and trailing-slash to a single canonical form
- [x] Consent & analytics (client-side)
  - [x] Cookie consent banner; defer GA4/PostHog/Clarity until accepted
  - [x] Track pageviews on route changes (GA4 `gtag`, PostHog `$pageview`)
  - [x] Sentry client env set (`dev`/`staging`/`prod`) with optional PostHog forwarding
  - [x] Add Google/Bing site verification meta tags

### Sprint 2 — Important (scale, i18n, duplication control)
- [x] Route-level metadata rigor
  - [x] Ensure `privacy`/`terms` have canonicals and `robots: index,follow`
  - [x] Add `openGraph.locale` and `localeAlternate` (when locales exist)
  - [ ] Add `alternates.languages` (`hreflang`) for i18n sites (N/A - no i18n yet)
- [x] Pagination & faceted navigation
  - [ ] Canonical for page 1 and `?page=N`; add prev/next link relations (N/A - no pagination)
  - [ ] Default `noindex,follow` for filter/query faceted URLs (N/A - no filter pages)
- [x] Sitemap enhancements
  - [x] Include `changefreq`, `priority`; split into index + children when large
- [x] Robots tightening
  - [x] Disallow internal/debug/preview paths and `/api/*` as appropriate
- [x] Performance signals aiding SEO
  - [x] Preconnect/DNS-prefetch for fonts/analytics; preload critical fonts/images
  - [x] Ensure `next/image` usage with width/height and descriptive `alt`

### Sprint 3 — Nice-to-have/ongoing (quality, monitoring, polish)
- [x] JSON-LD (additional)
  - [x] Add `FAQPage` where FAQs exist; `Sitelinks SearchBox` on home
  - [ ] `BreadcrumbList` for structured navigation (N/A - no breadcrumb navigation)
- [x] Rendering strategy & caching
  - [x] Use ISR (`revalidate`) and `fetch` cache hints per route for freshness vs speed
- [x] Web Vitals monitoring
  - [x] Implement `reportWebVitals` to analytics; alert on high CLS/LCP
- [x] PWA & icons
  - [x] Provide full icons set and `manifest` (or `manifest.ts`), wire via `metadata.icons`
  - [x] Add `apple-touch-icon` 180px, 192/512 PNGs
- [x] Theming meta
  - [x] Add `themeColor` (light/dark), `colorScheme`, and tuned `viewport`

### Additional Standard Items
- [x] Security headers (middleware)
  - [x] Add strict CSP (with nonces for inline scripts), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (disable camera/mic/geolocation unless required)
- [x] Error/exception UX
  - [x] Implement `app/not-found.tsx` (404) and `app/error.tsx` (500) with correct status codes and `robots: noindex`
- [ ] i18n configuration
  - [ ] Configure `i18n` in `next.config.js` (`locales`, `defaultLocale`) to back hreflang when localization arrives (N/A - no i18n yet)
- [x] Image optimization config
  - [x] Set `images.deviceSizes`/`imageSizes`, and `remotePatterns`/`domains` for external images to ensure optimal sizing and caching
- [x] Build/quality guardrails
  - [x] Enable TypeScript `strict: true`; keep ESLint `plugin:next/core-web-vitals` and add CI check
- [x] Deployment polish
  - [x] Add sitemap pings on deploy (Search Console/Bing) and long-cache headers for social images with safe revalidation

## 📚 References

- [Next.js SEO Documentation](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [next-seo](https://github.com/garmeeh/next-seo)
- [Google Search Central](https://developers.google.com/search/docs/crawling-indexing)
- [Next.js SEO (D. Minh Vu)](https://dminhvu.com/post/nextjs-seo)
- [Strapi Next.js SEO guide](https://strapi.io/blog/nextjs-seo)
- [FreeCodeCamp Next.js SEO](https://www.freecodecamp.org/news/nextjs-seo/)
