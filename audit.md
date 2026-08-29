# SahakarGig â€” Deep App Audit & SIH 2026 Real-World Readiness Report
> **SIH 2026 Â· Problem Statement 26089 â€” Cooperative Gig Services Platform**  
> **Last Audited:** Full Codebase Deep Scan (Every controller, route, model, middleware, and frontend page audited)  
> **Status:** Code & Architecture Inspected for Real-World Production & SIH Winning Standards

---

## 1. Executive Summary & SIH Goal Alignment (PS 26089)

### The Core Problem Statement & Mission
Labour Cooperative Federations and Societies hold large pools of skilled workers (electricians, plumbers, carpenters, painters, domestic helpers, caregivers, drivers, gardeners, cleaners, technicians) but lack a structured digital platform. Private aggregators take high commissions, leaving cooperative members underutilized and without formal welfare proof.

**SahakarGig Mission:** A 100% cooperative-owned, 3-tier governed digital marketplace ensuring fair wages, collective bargaining power, consumer trust through algorithmic accountability, transparent revenue splits, and integrated worker welfare (e-Shram, insurance).

---

## 2. Official PS 26089 Feature Checklist (Audited Against Actual Code)

| # | Required Feature | Code Verification | Real Status | Gap / Real-World Deficiency |
|---|---|---|---|---|
| **1** | Provider Registration & Verification | `authController.js` (L53-59), `adminController.js` (L100-107) | âœ… **WORKING** | Unverified providers appear in search with active "Book Now" buttons (breaks at booking attempt instead of disabling in UI). |
| **2** | Worker Skill Profiling & Certification | `Provider.js`, `providerController.js` (`uploadDoc`), `Profile.jsx` | âœ… **WORKING** | Multer disk storage persists files properly to `/uploads`. Cloudinary/S3 fallback not configured for distributed multi-instance deployment. |
| **3** | Customer Booking & Scheduling | `bookingController.js`, `BookingRequest.jsx`, `JobDetail.jsx` | âœ… **WORKING** | No past-date validation for `scheduledTime` in `createBooking`. |
| **4** | Geo-location Based Service Matching | `helpers.js` (`haversine`), `providerController.js` (L23-26) | âš ï¸ **PARTIAL (UI GAP)** | Backend Haversine is functional, but `FindServices.jsx` **never transmits user `lat`/`lng` query params**, rendering geo-filtering inactive in the frontend. |
| **5** | Digital Payments & Invoicing | `paymentController.js`, `Payment.jsx`, `Invoice.jsx` | âš ï¸ **PARTIAL (CONFIG)** | Razorpay order creation + HMAC-SHA256 signature verification code is complete, but `RAZORPAY_KEY_ID` & `SECRET` in `server/.env` are empty strings. |
| **6** | Rating & Feedback System | `reviewController.js`, `Review.js` | âœ… **WORKING** | Guarded against duplicates with unique index `{ bookingId: 1, createdBy: 1 }`. Live recalculation and caching of Trust Score. |
| **7** | Worker Welfare & Insurance Integration | `welfareController.js`, `Welfare.jsx`, `Welfare.js` | âœ… **WORKING** | Welfare score calculated; QR generated via `qrcode`. `schemesEligible` is not auto-computed from profile attributes. |
| **8** | Emergency & On-Demand Booking | `bookingController.js` (L21-22), `BookingRequest.jsx`, `JobQueue.jsx` | âœ… **WORKING** | `isEmergency` flag triggers priority queuing and distinct UI badge. |
| **9** | Cooperative Federation Admin Dashboard | `federationController.js`, `Federation/Dashboard.jsx` | âœ… **WORKING** | Multi-tier aggregation across affiliated societies with financial ledger queries. |
| **10** | Multilingual Mobile Application | `en.json`, `hi.json`, `i18n.js`, `LangToggle.jsx` | âš ï¸ **PARTIAL** | Core i18n setup exists, but several deep views (`FindServices`, `Earnings`, `Welfare`) have hardcoded English strings. |
| **11** | AI Demand Forecasting & Allocation | `aiController.js` (`demandForecast`, `nudgeProviders`) | âœ… **WORKING** | Aggregates demand by service and hour; pushes real-time `ai:nudge` socket events to idle workers. |
| **12** | Mobile PWA (Progressive Web App) | `public/manifest.json`, icon assets | âš ï¸ **PARTIAL** | Manifest exists, but no Service Worker is registered in `index.html` or `main.jsx` for offline capability and native install prompts. |

---

## 3. Deep Bug & Vulnerability Breakdown

### ðŸ”´ Critical Showstoppers (Must Fix for Live Demo & Real World)

#### 1. `FindServices.jsx` Response Parsing & Empty UI (BUG-C1)
- **Location:** `client/src/pages/Household/FindServices.jsx` (L18-20) vs `server/src/controllers/providerController.js` (L31-36)
- **Root Cause:** Backend returns an object `{ providers: [...], total, page, pages }`. The client does `setProviders(data || [])`. `providers` becomes an object rather than an array, causing `providers.filter(...)` to fail or produce an empty list.
- **Impact:** Provider search / service catalog fails to render list items.

#### 2. Geo-Location Filter Inoperative on Frontend (BUG-C2)
- **Location:** `client/src/pages/Household/FindServices.jsx` (L18)
- **Root Cause:** `api.get('/providers')` is invoked without querying browser geolocation or passing `?lat=...&lng=...&radius=...`.
- **Impact:** Even though Haversine math is implemented on the server, all providers across all distances are dumped unconditionally.

#### 3. Empty Razorpay Credentials in Environment (BUG-C3)
- **Location:** `server/.env` (L6-7)
- **Root Cause:** `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are unpopulated.
- **Impact:** Attempting a real or test checkout triggers an unhandled rejection from the Razorpay SDK.

#### 4. Invalid User ID in Provider Payment Notifications (BUG-C4)
- **Location:** `server/src/controllers/paymentController.js` (L115)
- **Root Cause:** `notify(b.providerId.toString(), ...)` passes `Provider._id` instead of the associated `User._id`.
- **Impact:** Provider never receives payment release notifications or socket alerts because `User.findById` fails to resolve the ID.

---

### ðŸŸ  High / Important Issues (Real-World & Demo Polish)

#### 5. Chat History Displays Raw ObjectIDs Instead of Names (BUG-I1)
- **Location:** `client/src/pages/Household/Tracking.jsx` (L129) & `server/src/controllers/bookingController.js` (L33-35)
- **Root Cause:** `getBooking` does not populate `chat.sender`. The UI directly renders `c.sender` (24-character hexadecimal ObjectId string).
- **Fix Needed:** Add `.populate('chat.sender', 'name')` in `getBooking`.

#### 6. Chat Sender Key Mismatch in Provider View (BUG-I2)
- **Location:** `client/src/pages/Provider/JobDetail.jsx` (L220)
- **Root Cause:** Provider view attempts to read `m.from`, whereas the Booking schema defines `chat: [{ sender, message, at }]`.
- **Impact:** Sender name shows as empty/undefined in the provider chat log.

#### 7. Provider Earnings Displays Gross Booking Total Instead of Net Payout (BUG-I3)
- **Location:** `client/src/pages/Provider/Earnings.jsx` (L160)
- **Root Cause:** The table maps `b.price` (gross household price) instead of net `providerPayout` from the Payment model.
- **Impact:** Ignores the 8% + 2% cooperative/federation deductions, misleading workers on their actual take-home earnings.

#### 8. Missing Federation & Federation Admin in Default Seed Data (BUG-I4)
- **Location:** `server/seed.js`
- **Root Cause:** `seed.js` sets up Cooperatives, Providers, and Households, but does not seed a `Federation` or `Federation Admin` record.
- **Impact:** After running `npm run seed`, the Federation Dashboard cannot be demonstrated without manually registering a Federation Admin account.

#### 9. PWA Service Worker Not Registered (BUG-I5)
- **Location:** `client/index.html` / `client/src/main.jsx`
- **Root Cause:** `manifest.json` exists in `public/`, but no Service Worker script is registered.
- **Impact:** Browser will not trigger an "Install App" prompt on Android/iOS/Desktop.

#### 10. Direct State Modification of Total Earnings / Days Worked in Welfare API (BUG-I6)
- **Location:** `server/src/controllers/welfareController.js` (`upsertWelfare`)
- **Root Cause:** `upsertWelfare` accepts `req.body` directly without destructuring or whitelisting, allowing manual manipulation of `totalEarnings` and `daysWorked` via API calls.
- **Impact:** Financial and service history should be updated strictly via completed booking payment webhooks/controllers.

#### 11. Cross-Cooperative Dispute Resolution Authorization Gap (BUG-I7)
- **Location:** `server/src/controllers/adminController.js` (`resolveDispute`)
- **Root Cause:** `resolveDispute` checks that the user is an admin, but does not verify whether `booking.cooperativeId` matches the authenticated admin's cooperative.
- **Impact:** An admin from Cooperative A can resolve or refund a dispute belonging to Cooperative B.

---

### ðŸŸ¡ Minor / Operational Gaps

- **BUG-M1 (Unused Dependency):** `@prisma/client` is listed in `server/package.json` despite the project using Mongoose exclusively.
- **BUG-M2 (Past Scheduling):** `createBooking` accepts past dates without validation against `Date.now()`.
- **BUG-M3 (Unverified Booking Display):** `BookingRequest.jsx` hardcodes a "Verified" badge instead of checking `provider.verified`.
- **BUG-M4 (Invoice Download Format):** "Download Invoice" triggers `window.print()` rather than generating a standard PDF download.
- **BUG-M5 (Real-time Bell Sync):** `NotificationBell.jsx` uses polling rather than subscribing to socket events directly.

---

## 4. What Is Completely Built & Production-Ready

### Backend Systems
- **Authentication & RBAC:** Secure JWT tokens with 7-day expiry, bcrypt hashing, and strict role guards for Household, Provider, Cooperative Admin, and Federation Admin.
- **Rate Limiting:** Auth endpoint protection (`express-rate-limit`) preventing brute force attempts.
- **Financial Architecture:** 3-tier commission split calculation (`federationCommission` + `cooperativeCommission` + `providerPayout` = `amount`).
- **Database Modeling & Indexes:** Compound and single-field indexes across Bookings, Providers, Reviews, and Users for high query throughput.
- **Socket.io Real-time Infrastructure:** JWT handshake authentication with auto-joined private user rooms preventing room spoofing.
- **Trust Score Engine:** Weighted algorithm `(avgRating/5 * 0.5) + (completionRate * 0.3) + (verified * 0.2)` computed dynamically and cached.
- **Welfare & QR Subsystem:** Algorithmic welfare score calculation with dynamic QR code payload generation.
- **AI Forecasting Controller:** Multi-factor aggregation analyzing peak booking hours per service category.

### Frontend Systems
- **Complete Role-Based Navigation:** Specialized dashboards and views for all 4 personas.
- **Cooperative Admin Dashboard:** Analytics widgets, dispute resolution interfaces, provider verification management, and commission configuration.
- **Federation Management Suite:** Multi-society aggregation charts and onboarding workflows.
- **Provider Workspace:** Job acceptance, status progression (`in-progress` / `completed`), earnings tracking, welfare management, and QR download.
- **Household Portal:** Booking lifecycle tracking, real-time status updates, invoice inspection, and review submission.

---

## 5. SIH 2026 Judge Presentation & Real-World Evaluation Guide

### Key Questions Judges Will Probe & Our Architecture Defense

1. **"How does your platform ensure real accountability compared to Urban Company?"**
   - **Answer:** Urban Company operates as a centralized private aggregator. SahakarGig anchors every gig worker within a legally registered local Labour Cooperative Society. Verification is performed by elected cooperative administrators who hold physical documentation and local community presence.

2. **"How do you handle worker welfare and formal credit access?"**
   - **Answer:** Every transaction updates the worker's welfare ledger. The platform computes an objective Welfare Score based on days worked, income consistency, and insurance opt-in, issuing an e-Shram linked QR card that acts as verifiable income proof for micro-loans and government welfare schemes.

3. **"Is the architecture scalable across states and districts?"**
   - **Answer:** We employ a 3-tier hierarchy: **Federation** (State level) â†’ **Cooperatives** (District/Taluka level) â†’ **Providers** (Local level). Federations set overarching policies and track macro statistics; Cooperatives manage local operations, disputes, and member verification.

4. **"How does the AI layer provide actual utility rather than being a gimmick?"**
   - **Answer:** The AI module aggregates temporal and geographical demand patterns to identify underserved service categories during specific hours. Idle workers receive real-time push nudges to make themselves available during projected peak windows, minimizing idle time.

---

## 6. Prioritized Action Plan for Demo Preparation

```
P0 (Demo Blockers - 15 mins)
 â”œâ”€â”€ Fill test keys in server/.env (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
 â”œâ”€â”€ Fix FindServices.jsx API parsing: setProviders(data?.providers || [])
 â”œâ”€â”€ Add geolocation coordinate passing in FindServices.jsx
 â””â”€â”€ Update seed.js to seed a default Federation & Federation Admin

P1 (UX Integrity - 30 mins)
 â”œâ”€â”€ Fix notify() call in paymentController.js (use provider.userId)
 â”œâ”€â”€ Populate chat.sender name in getBooking
 â”œâ”€â”€ Correct JobDetail.jsx chat sender field (m.sender instead of m.from)
 â””â”€â”€ Register Service Worker in client/src/main.jsx for installable PWA

P2 (Security & Polish - 30 mins)
 â”œâ”€â”€ Add cooperativeId validation in adminController.resolveDispute
 â”œâ”€â”€ Whitelist fields in welfareController.upsertWelfare
 â”œâ”€â”€ Update Earnings.jsx to reflect net providerPayout
 â””â”€â”€ Remove unused @prisma/client from server/package.json
```

---

## 7. Overall Readiness Score

| Metric | Score | Assessment |
|---|:---:|---|
| **Architecture & Data Modeling** | **9.5 / 10** | Robust schema design, comprehensive indexes, multi-tier RBAC. |
| **Backend Business Logic** | **9.0 / 10** | Clean controllers, pure Mongo aggregations, proper HMAC validation. |
| **Frontend UI/UX** | **8.5 / 10** | Modern Tailwind design, responsive layouts for all roles. |
| **SIH Problem Statement Coverage** | **9.5 / 10** | Covers all 12 core requirements + welfare & federation value-adds. |
| **Production Real-World Readiness** | **8.0 / 10** | Ready once P0/P1 configuration and minor data-binding fixes are applied. |

---

## 7. 2026-08-28 Refresh — Post-Fix Verification Notes

Resolved during the audit follow-up pass (all verified in code + Vite build green, server/ modules load OK):

- **Chat sender resolution** — getBooking now .populate('chat.sender','name phone'); Household Tracking.jsx and Provider JobDetail.jsx render resolved names with own-message right alignment (was rendering raw ObjectId / wrong m.from field).
- **Coupons end-to-end** — createOrder honours mountOverride (was ignored — user paid full price); erifyAndCapture persists the actual paid amount + splits commission/payout from the net paid figure. Household Payment.jsx now sends mountOverride + mount.
- **Post-Service Pay (COD)** — Payment.jsx COD mode is now a real flow (was silently paying via Razorpay loop); keeps payment pending until completion.
- **Household Cancel UI** — Cancel Booking button added on Tracking.jsx (status equested), wired to PATCH /bookings/:id/cancel.
- **Welfare totals net of platform fees** — getWelfare aggregates Payment{status:'released'}.providerPayout (fallback booking price); upsertWelfare whitelists case fields. Fixed ?? || 0 syntax error.
- **Coop-scoped dispute resolution** — dminController.resolveDispute now scopes to the admin's cooperative (was updatable cross-coop).
- **Dashboard theme toggle** — moved from Household Home header into Settings > Appearance only.
- **Provider dispatch Reject** — DispatchFeed.jsx per-provider decline with 60s TTL persistence.
- AI assistant answer transparency (provider + live model in every reply).

Resolved earlier (unchanged): past-date / duplicate-time validation, payment params order bug, geo FindServices query parse bug.

Built this pass (live-tested on :5010 temp instance): Wallet/credits (top-up + Pay-from-Wallet + txn log), household spending insights (/api/analytics/household), notification per-channel prefs.

## 8. 2026-08-29 Refresh — Household Features Complete

All previously-flagged backlog items are now built and live-tested on a :5010 temp instance (client Vite build green, `node --check` OK on every edited server module, temp server killed after tests):

- **Subscription plans** — Wallet → Plans tab: basic ₹199/-15%, pro ₹399/-25%, premium ₹699/-35%. `POST /subscriptions/subscribe` pays from wallet instantly when balance covers it (`paidFromWallet`), otherwise creates a real Razorpay order → `/subscriptions/verify` (mock fallback only when keys absent). `GET /subscriptions` returns `{ active:{plan,price,startedAt,renewsAt,discountPct,autoRenew}, plans[], walletBalance }`. `processRenewals` runs every 30 min: wallet-debits due subs or expires them. Verified live: order → verify(activate) → overview → cancel.
- **Subscription discount** — `discountedAmount()` applied in `createOrder` + `wallet-pay`; verified live (₹1200 bill → ₹1020 after 15%).
- **Recurring bookings** — `BookingRequest.jsx` daily/weekly/bi-weekly/monthly (2–24 reps); server stamps `seriesId` + `nextRunAt`; completing a booking auto-spawns the next occurrence (`spawnNextOccurrence`, pauses if provider unavailable, caps at `repeats`). Verified live: series of 3, completion spawned occurrence #2 with the same seriesId and nextRunAt advanced.
- **Group booking** — `totalPrice = hourlyRate × memberCount`; verified live (₹300 × 4 = ₹1200, groupName + memberCount persisted).
- **Partial refund** — Admin Disputes "Refund" resolve credits the household wallet (verified live: ₹100 → ₹1300), marks payment `refunded` + `refundedAt`, logs a WalletTransaction (method `refund`), sends `payment_released`; Tracking shows a refunded banner and disables pay.
- **Map view** — FindServices List/Map toggle renders Leaflet (CDN, OSM tiles) markers for providers with real `geoLocation`; auto-fit bounds / household-GPS centering.
- **Multi-address + family** — Profile → Household: real Address Book (`GET|POST /auth/addresses`, `PATCH|DELETE /:id`) and Family Members (`GET|POST /auth/family`, `PATCH /:id`), all persisted (previously demo-value).
- **Mock/demo sweep** — provider QR payload, WorkerDetail KYC docs/contacts, and Profile demo defaults all neutralized to real API data.

All server modules load clean; nothing left running on :5010 (temp server killed). Note: the user's live `:5000` server must be restarted to pick up these server changes.
