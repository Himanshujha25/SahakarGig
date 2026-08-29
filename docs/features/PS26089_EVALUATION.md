# PS-26089 — Full Alignment & Gap Evaluation
## SahakarGig vs Problem Statement: Cooperative Gig Services Platform
### Evaluation Date: 2026-08-28 | Branch: `dev`

---

> **How to read this document**
> - ✅ = Fully implemented and demo-ready
> - ⚠️ = Partially implemented — skeleton/UI exists but backend or integration is incomplete
> - ❌ = Not implemented — required by PS, missing from codebase

---

## 📊 Overall Alignment Score

| PS Requirement Area | Score | Status |
|---------------------|-------|--------|
| Service Provider Registration & Verification | 7 / 10 | ⚠️ |
| Worker Skill Profiling & Certification | 5 / 10 | ⚠️ |
| Customer Booking & Scheduling | 9 / 10 | ✅ |
| Geo-location Based Service Matching | 6 / 10 | ⚠️ |
| Digital Payments & Invoicing | 7 / 10 | ⚠️ |
| Rating & Feedback Mechanism | 5 / 10 | ⚠️ |
| Worker Welfare & Insurance Integration | 6 / 10 | ⚠️ |
| Emergency & On-Demand Service Booking | 9 / 10 | ✅ |
| Cooperative Federation Admin Dashboard | 7 / 10 | ⚠️ |
| Multilingual Mobile Application | 2 / 10 | ❌ |
| AI-based Demand Forecasting & Workforce Allocation | 6 / 10 | ⚠️ |
| **Technology: Mobile Applications** | 2 / 10 | ❌ |
| **Technology: AI** | 6 / 10 | ⚠️ |
| **Technology: Geo-Spatial Technology** | 6 / 10 | ⚠️ |
| **Technology: Digital Payment Systems** | 7 / 10 | ⚠️ |
| **Technology: Cloud Computing** | 3 / 10 | ❌ |

### 🎯 **Overall PS Alignment: ~58 / 100**

> **Verdict:** Strong foundation on booking flow, dispatch, and emergency booking.
> Critical gaps in: native mobile app, full i18n, actual payment execution, real AI forecasting, and cloud deployment.

---

## 1. SERVICE PROVIDER REGISTRATION & VERIFICATION — 7/10

### ✅ What's Implemented
- Provider signup with role assignment (`cooperative` role, JWT)
- Provider profile: skills[], hourlyRate, availabilitySlots, documents[], geoLocation
- `verified` boolean field in Provider model
- Admin can toggle verification via `/api/admin/providers/:id/verify`
- Document upload support (Multer — `documents[]` field in schema)
- Trust Score computed on-the-fly: `base(50) + verified(+20) + rating≥4.5(+15) + jobs≥10(+15)`
- `TrustSystemBadge.jsx`, `VerifiedBadge.jsx`, `TrustRing.jsx` visual components
- Cooperative links provider: `cooperativeId` in Provider schema

### ⚠️ Partial
- Document upload exists in schema but **no Cloudinary integration confirmed** — uploads may be local-only
- Verification queue exists in `Admin/Verifications.jsx` but **no in-app document viewer** — admin cannot read uploaded files in-app
- `isVerified` vs `verified` field name inconsistency in controller vs schema (bug risk)

### ❌ Missing (PS Required)
- **KYC/Aadhaar verification** — no DigiLocker / UIDAI API integration
- **Police/background check** — no integration, just a placeholder field concept
- **Certificate validation** — no system to validate skill certification documents
- **QR-code provider ID card** — mentioned in PRD, not built (PS implies digital identity)
- **Re-verification trigger** — admin cannot force provider to re-submit docs
- **Cooperative-level verification workflow** — verification is done at admin level only, not at cooperative society level as PS specifies

---

## 2. WORKER SKILL PROFILING & CERTIFICATION — 5/10

### ✅ What's Implemented
- `skills: [String]` array in Provider model
- Skill-based filtering in provider list (`listProviders` — `$in` query)
- Skill display in provider profile and dispatch feed matching
- Skills shown in Dispatch accept flow (broadcast booking shows provider skills)
- e-Shram ID field in Welfare model (`eShramId`, `eShramVerificationStatus`)

### ⚠️ Partial
- e-Shram verification is `self_declared` or `govt_verified` enum — but **no actual govt API call is made**, it's mock-only
- Skills are free-text strings — **no standardised skill taxonomy** (PS implies certification categories like NCS/NSDC codes)

### ❌ Missing
- **Certification upload & validation** — no separate cert schema (plumbing cert, electrician license)
- **Skill test / assessment** — no in-app skill test or third-party assessment integration
- **NSDC / NCS skill code mapping** — no national skill framework alignment
- **Experience years / portfolio** — no field in schema
- **Training completion tracking** — no module for upskilling content
- **Skill endorsements** — no peer/cooperative endorsement of skill

---

## 3. CUSTOMER BOOKING & SCHEDULING — 9/10 ✅

### ✅ What's Implemented
- **Full booking lifecycle:** `requested → accepted → in-progress → completed → cancelled → disputed`
- Slot-based scheduling with provider availability validation (day + time range enforcement in `createBooking`)
- Atomic conflict guard — no double-booking same provider slot
- IST timezone-aware slot validation
- Direct booking (choose provider → pick slot → book)
- Emergency flag (`isEmergency: true`, `priority: 1`)
- Household can cancel before provider accepts
- Dispute filing with reason (`disputeBooking` controller)
- In-booking chat (`chat[]` array, Socket.io push via `booking:chat`)
- Booking pagination (page + limit in `householdBookings` / `providerBookings`)
- Provider can accept, reject, mark in-progress, mark completed
- Real-time status push via Socket.io (`booking:updated`, `booking:new`)
- `Tracking.jsx` page for live status

### ⚠️ Partial
- **No rescheduling** — once booked, date/time cannot be changed
- **No repeat/recurring bookings** — each booking is one-off

### ❌ Missing
- **Calendar view** — no visual calendar for household or provider
- **Group/community booking** — book for building society (mentioned in PS context)

---

## 4. GEO-LOCATION BASED SERVICE MATCHING — 6/10

### ✅ What's Implemented
- `geoLocation: { lat, lng }` field in Provider schema (indexed concepts)
- **Haversine function** implemented in `server/src/utils/helpers.js`
- Used in broadcast booking: `createBroadcastBooking` filters by radius + Haversine
- `availableBroadcastBookings` filters live feed by provider's saved geoLocation vs booking coordinates
- Household submits `lat/lng` in dispatch booking
- Radius configurable (`radiusKm` param, default 25km)

### ⚠️ Partial
- **Direct booking has no geo filter** — `listProviders` does NOT filter by distance; all verified providers returned regardless of location
- **Provider geoLocation is self-reported** — no GPS capture at time of booking
- **No map UI** — no Google Maps / Leaflet integration; location is text + lat/lng only
- Fallback: providers without geoLocation are treated as "in-range" (broadcast) — this inflates results

### ❌ Missing
- **Map view in Find Services** — browse providers on a map
- **Real-time provider location tracking** — provider shares live GPS during a job
- **Google Maps / Leaflet integration** in frontend
- **PIN code / area-based filtering** as alternative to GPS
- **Distance shown to household** on provider card

---

## 5. DIGITAL PAYMENTS & INVOICING — 7/10

### ✅ What's Implemented
- Razorpay order creation (`/api/payments/create-order`)
- Razorpay payment verification (signature check)
- `Payment` model: `bookingId, amount, cooperativeCommission, providerPayout, status`
- `Payout` model: `providerId, amount, period, status, payoutRef`
- Invoice model and `/api/payments/invoice/:id` endpoint
- `Invoice.jsx` page — household can view invoice
- `Payment.jsx` — Razorpay checkout UI
- `FairWageBreakdown.jsx` — shows payment split (cooperative commission vs provider payout)
- Commission calculation stored in Payment model

### ⚠️ Partial
- **Razorpay payout API not called** — `Payout` model exists but actual money transfer to provider bank account is NOT wired; status is manually set
- **Invoice PDF download** — Invoice page exists in UI but no PDF generation (jsPDF / Puppeteer not integrated)
- Commission rate is hardcoded — not dynamically read from cooperative settings

### ❌ Missing
- **Bank account / UPI linking for providers** — no provider bank detail schema
- **Actual payout execution** — Razorpay Payout API not integrated
- **Refund flow** — no Razorpay refund API call on dispute resolution
- **GST / TDS calculation** — no tax deduction logic
- **Wallet / credit system** — no household wallet
- **Subscription / plan-based pricing** — not present

---

## 6. RATING & FEEDBACK MECHANISM — 5/10

### ✅ What's Implemented
- `Review` model: `bookingId, rating (1-5), comment, createdBy`
- `POST /api/reviews` endpoint
- Reviews fetched in provider profile and worker detail page
- Average rating affects Trust Score computation
- `completedJobs` count tracked in trust score logic

### ⚠️ Partial
- **No rating UI flow** — there is no "leave a review" modal/page triggered after booking completion; the endpoint exists but the household has no in-app path to submit a rating post-job
- `rating` and `completedJobs` are on Provider model but **not auto-updated** when a review is submitted — requires manual recalculation

### ❌ Missing
- **Post-completion rating prompt** — auto-trigger a review form when booking = completed
- **Provider rating update on new review** — no hook to recalculate Provider.rating on review create
- **Two-way rating** — provider cannot rate the household
- **Review moderation** — cooperative admin cannot remove abusive reviews
- **Photo evidence in review** — household cannot attach a photo with feedback
- **Response to review** — provider cannot reply to a review

---

## 7. WORKER WELFARE & INSURANCE INTEGRATION — 6/10

### ✅ What's Implemented
- `Welfare` model: eShramId, eShramVerificationStatus, insuranceOptIn, insuranceProvider, schemesEligible, totalEarnings, daysWorked, welfareScore
- e-Shram ID self-declaration + mock govt lookup (`eShramVerificationStatus`)
- PMSBY insurance shown by name on dispatch accept card
- `WelfareBadge.jsx` — welfare badge component
- `WorkerWelfareDashboard.jsx` — welfare summary component
- `Provider/Welfare.jsx` — provider welfare page
- Welfare data shown in `acceptBroadcastRequest` response (household sees worker's insurance status)

### ⚠️ Partial
- **e-Shram verification is mock** — no actual e-Shram portal API call
- **Insurance opt-in is a boolean** — no actual PMSBY/PMJJBY enrollment API
- **Scheme eligibility is a string array** — not computed; manually set

### ❌ Missing
- **Welfare scheme enrollment from UI** — provider cannot actually enroll in a scheme from the app
- **Claim submission** — no claim filing feature
- **ESIC / PF integration** — no formal social security linkage
- **Welfare fund from commission** — no automatic % allocation from booking commission to welfare fund
- **Cooperative welfare fund dashboard** — no visibility for cooperative on collective welfare fund balance
- **Government scheme API integration** (Jan Suraksha, PMSBY, e-Shram portal)

---

## 8. EMERGENCY & ON-DEMAND SERVICE BOOKING — 9/10 ✅

### ✅ What's Implemented
- **Broadcast dispatch system** — the most sophisticated feature in the app
- `createBroadcastBooking` — household posts category + location; system finds nearby providers
- `isEmergency: true` flag with `priority: 1` in Booking model
- Real-time Socket.io push: `booking:broadcast_new` to all matched providers
- **Atomic first-acceptance race lock** — `findOneAndUpdate` with `providerId: null` guard (zero double-assignment)
- 6-hour TTL auto-expiry for stale broadcast jobs (`BROADCAST_TTL_MS`)
- `broadcastAll('booking:claimed')` — removes job from all other providers' feed on claim
- `broadcastAll('booking:cancelled')` — ghost-cancels from all feeds
- Provider gets household details only after acceptance (privacy guard)
- `Household/Dispatch.jsx` — full emergency dispatch UI
- `Provider/DispatchFeed.jsx` — live provider feed

### ⚠️ Partial
- **No SLA/ETA display** — household does not see estimated arrival time after provider accepts
- **No surge pricing** — emergency bookings charged same rate

### ❌ Missing
- **Provider GPS sharing post-accept** — no live location tracking of provider en-route
- **SOS / panic button** — for household safety after provider arrives
- **Emergency category presets** — quick-tap "burst pipe", "power outage" shortcuts
- **Surge pricing for peak/emergency** — mentioned in PRD (nice-to-have), not built

---

## 9. COOPERATIVE FEDERATION ADMIN DASHBOARD — 7/10

### ✅ What's Implemented
- `Admin/Dashboard.jsx` — KPI cards: providers, bookings, revenue, disputes
- Revenue charts (Recharts — `buildRevenueSeries` in adminController)
- `Admin/Providers.jsx` — full provider list with search + filter
- `Admin/WorkerDetail.jsx` — deep worker profile: bookings, earnings, welfare, documents, reviews
- `Admin/Verifications.jsx` — pending verification queue
- `Admin/Disputes.jsx` — dispute list
- `Admin/Commission.jsx` — commission settings
- `Federation/Dashboard.jsx` — federation-level overview
- `Federation/CooperativeDetail.jsx` — per-cooperative deep-dive
- `Federation/Earnings.jsx` — federation earnings breakdown
- Demand forecast API (`/api/ai/demand-forecast`) — aggregation by service + hour

### ⚠️ Partial
- **Dispute detail / resolution actions** — list exists but no in-app arbitration decision (refund, penalty, warn)
- **Verification document viewer** — admin cannot view the actual uploaded file in-app
- **Provider leaderboard** — data exists but no dedicated leaderboard UI component

### ❌ Missing
- **Cooperative registration flow** — new cooperative cannot self-register; manual DB insert required
- **Cross-cooperative analytics** — no comparison dashboard between cooperatives
- **Geographic booking heatmap** — no map-based analytics
- **Bulk actions** — no bulk verify / deactivate
- **Audit log** — no admin action audit trail
- **Report download** — no PDF/CSV export of any dashboard data
- **Announcement broadcast** — federation cannot send push/in-app notice to all providers

---

## 10. MULTILINGUAL MOBILE APPLICATION — 2/10 ❌

### ✅ What's Implemented
- `LangToggle.jsx` — English/Hindi toggle button component exists

### ⚠️ Partial
- Toggle component exists but **no translation strings are wired** — clicking Hindi does not change any text; react-i18next is not actually configured with locale files

### ❌ Missing — CRITICAL PS REQUIREMENT
- **react-i18next not configured** — no `i18n.js` config, no `locales/` folder, no translation JSON files
- **Hindi translation strings** — zero UI strings translated
- **Native mobile application** — app is a web app (React + Vite); PS explicitly requires "Mobile Applications" as a technology component
- **React Native / Flutter build** — no mobile codebase exists
- **PWA is not a native app** — PWA manifest exists (`PwaInstallBanner.jsx`) but PS context implies a native app
- **Offline support** — no service worker data caching for rural/low-connectivity use

> ⛔ This is the **largest gap vs the PS**. Ministry of Cooperation targets rural cooperative workers who primarily use mobile phones. A web-only solution without proper i18n and native mobile support is a significant miss.

---

## 11. AI-BASED DEMAND FORECASTING & WORKFORCE ALLOCATION — 6/10

### ✅ What's Implemented
- `demandForecast` — MongoDB aggregation: booking counts by service + hour over last N days
- `nudgeProviders` — identifies idle providers and Socket.io pushes a nudge message
- `GET /api/ai/demand-forecast` — returns topServices + hourlyTotals
- `AIChatbot.jsx` — Gemini-powered conversational AI (role-aware system prompts)
- AI Voice Search (`AIVoiceSearchModal.jsx`)
- Demand forecast shown in Admin Dashboard

### ⚠️ Partial
- **Demand forecasting is rule-based aggregation, not ML** — uses MongoDB `$group` + sort; no predictive model, no time-series ML (ARIMA, Prophet, etc.)
- **Workforce allocation is nudge-only** — nudge = push a socket message to idle providers; no actual assignment, scheduling, or roster optimization

### ❌ Missing
- **Predictive forecasting** — actual ML model (even a simple regression on historical data)
- **Automated workforce scheduling** — "allocate Worker A to Area B tomorrow 9-11am based on forecast"
- **Surge detection** — real-time demand spike detection with alerts
- **AI provider-job matching** — skill + rating + distance + availability-aware ranking
- **Dynamic pricing AI** — demand-based price suggestions (mentioned in PRD)
- **Gemini chatbot used for forecasting** — chatbot is conversational only; not connected to forecasting data

---

## 🛠️ Technology Components Assessment

| PS Technology | Implemented? | Notes |
|---------------|-------------|-------|
| **Mobile Applications** | ❌ No | Web-only; PWA exists but not a native app |
| **Artificial Intelligence (AI)** | ⚠️ Partial | Gemini chatbot ✅, forecast = SQL aggregation not ML |
| **Geo-Spatial Technology** | ⚠️ Partial | Haversine ✅, broadcast filtering ✅, no map UI |
| **Digital Payment Systems** | ⚠️ Partial | Razorpay checkout ✅, actual payout ❌ |
| **Cloud Computing** | ❌ No | No documented cloud deployment; no CI/CD, no cloud storage config confirmed |

---

## 🚨 Critical Gaps — Must Fix Before Full Evaluation

> These are the items most likely to be flagged by a Ministry evaluator or SIH judge.

### 1. No Native Mobile App
**PS explicitly lists "Mobile Applications" as a required technology component.**
Action: Either build a React Native wrapper or convert to a proper PWA with offline support + Service Worker.

### 2. Multilingual Not Functional
The `LangToggle.jsx` is a placeholder. **Zero text is translated to Hindi.**
Action: Add `react-i18next`, create `locales/en/` and `locales/hi/` JSON files, translate all key UI strings.

### 3. Rating Flow Has No UI Trigger
Reviews endpoint exists but **there is no "Rate your provider" prompt** after booking completion.
Action: Add a post-completion rating modal in `Bookings.jsx` when `status === 'completed'` and `paymentStatus === 'paid'`.

### 4. Provider Rating Not Auto-Updated
`Review.create()` does not update `Provider.rating` or `Provider.completedJobs`.
Action: Add a post-save hook or update logic in the review controller.

### 5. Actual Payout Not Executed
`Payout` model and UI exist, but **no Razorpay Payout API call is made**. Providers receive no real money.
Action: Integrate Razorpay Payout API (Fund Account + Payout APIs).

### 6. Document Viewer Missing in Verification
Admin sees a list of pending providers but **cannot view uploaded documents** in-app.
Action: Render Cloudinary image URLs in `Verifications.jsx` and `WorkerDetail.jsx`.

### 7. Dispute Resolution Has No Actions
`Disputes.jsx` lists disputes but **admin cannot resolve, refund, or penalise** from the UI.
Action: Add dispute action buttons: "Refund household", "Warn provider", "Mark resolved".

---

## ✅ Strengths — What the PS Evaluator Will Praise

1. **Broadcast Dispatch System** — the atomic first-acceptance race-lock with TTL expiry is genuinely production-grade
2. **Booking Lifecycle** — complete state machine with Socket.io real-time updates
3. **In-booking Chat** — real-time chat embedded in booking (PS mentions "chat log" for dispute resolution)
4. **Welfare Model** — e-Shram ID, PMSBY insurance, schemes eligible — shows deep PS alignment
5. **Trust Score** — cooperative verification weighted into score, visible on every provider card
6. **Fair Wage Breakdown** — `FairWageBreakdown.jsx` directly addresses PS's "fair wages" mandate
7. **Emergency/On-Demand** — priority booking + geo-broadcast fully functional
8. **Cooperative Governance Layer** — cooperative ↔ provider ↔ booking chain with commission split

---

## 📋 Prioritised Implementation Roadmap

### 🔴 P0 — Do Before Demo (PS Compliance Blockers)

| Task | Effort | PS Requirement |
|------|--------|---------------|
| Wire react-i18next with Hindi strings for key pages | 1 day | Multilingual |
| Add post-completion rating modal (UI only, hook to existing API) | 4 hrs | Rating & Feedback |
| Auto-update Provider.rating on review create | 2 hrs | Rating & Feedback |
| Add document viewer in Verifications/WorkerDetail pages | 4 hrs | Verification |
| Add dispute resolution action buttons in Disputes.jsx | 4 hrs | Admin Dashboard |

### 🟠 P1 — Complete Core PS Features

| Task | Effort | PS Requirement |
|------|--------|---------------|
| Convert to PWA with full offline support + service worker | 2 days | Mobile App |
| Add map view (Leaflet) in FindServices.jsx | 1 day | Geo-spatial |
| Add geo-distance filter to listProviders | 3 hrs | Geo-spatial |
| Razorpay Payout API integration for provider payouts | 1 day | Digital Payments |
| Refund API call on dispute resolution | 4 hrs | Digital Payments |
| Invoice PDF download (jsPDF) | 4 hrs | Invoicing |

### 🟡 P2 — AI & Advanced Features

| Task | Effort | PS Requirement |
|------|--------|---------------|
| Demand forecast chart in Admin Dashboard (already have API) | 3 hrs | AI/Forecasting |
| Provider-job AI match scoring (skill + distance + rating rank) | 1 day | AI Workforce |
| e-Shram ID mock verification flow with UI feedback | 4 hrs | Welfare |
| Welfare scheme enrollment from provider UI | 4 hrs | Welfare |
| Announcement broadcast (federation → all providers) | 4 hrs | Admin Dashboard |

### 🟢 P3 — Polish & Production Readiness

| Task | Effort | Notes |
|------|--------|-------|
| React Native / Expo mobile app | 1 week | True mobile support |
| Real ML demand forecasting model | 3 days | PS AI component |
| Cloud deployment (Railway / Render / AWS) | 1 day | PS Cloud component |
| Rate limiting (express-rate-limit) | 2 hrs | Security |
| Refresh token | 4 hrs | Auth |
| Unit + integration tests | 3 days | Production readiness |

---

## 📎 PS Requirement → Feature Mapping Table

| PS Expected Feature | Our Feature | File(s) | Status |
|--------------------|------------|---------|--------|
| Service provider registration & verification | Provider signup, document upload, admin verify | `auth.js`, `Verifications.jsx`, `WorkerDetail.jsx` | ⚠️ |
| Worker skill profiling & certification | `skills[]` array, e-Shram ID | `Provider.js`, `Welfare.js`, `Profile.jsx` | ⚠️ |
| Customer booking & scheduling | Full booking lifecycle + slot picker | `bookingController.js`, `BookingRequest.jsx`, `Bookings.jsx` | ✅ |
| Geo-location based service matching | Haversine + broadcast radius filter | `bookingController.js`, `helpers.js`, `Dispatch.jsx` | ⚠️ |
| Digital payments & invoicing | Razorpay checkout, Invoice model | `paymentController.js`, `Payment.jsx`, `Invoice.jsx` | ⚠️ |
| Rating & feedback mechanism | Review model + API | `Review.js`, `reviews.js` | ⚠️ |
| Worker welfare & insurance integration | Welfare model, e-Shram, PMSBY | `Welfare.js`, `Welfare.jsx`, `WelfareBadge.jsx` | ⚠️ |
| Emergency & on-demand service booking | Broadcast dispatch + isEmergency flag | `bookingController.js`, `Dispatch.jsx`, `DispatchFeed.jsx` | ✅ |
| Cooperative federation admin dashboard | Admin + Federation portals | `Admin/*`, `Federation/*`, `adminController.js` | ⚠️ |
| Multilingual mobile application | `LangToggle.jsx` (placeholder only) | `LangToggle.jsx` | ❌ |
| AI-based demand forecasting | Aggregation-based forecast + Gemini chatbot | `aiController.js`, `AIChatbot.jsx` | ⚠️ |
