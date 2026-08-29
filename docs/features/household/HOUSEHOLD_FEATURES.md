# Household Portal — Feature Documentation

> All features for the Household (Customer) portal at `/household/*`

---

## Pages

| Page | File | Route |
|------|------|-------|
| Home | `Household/Home.jsx` | `/household/home` |
| Find Services | `Household/FindServices.jsx` | `/household/find` |
| Provider Profile | `Household/ProviderProfile.jsx` | `/household/provider/:id` |
| Booking Request | `Household/BookingRequest.jsx` | `/household/book/:id` |
| Bookings | `Household/Bookings.jsx` | `/household/bookings` |
| Tracking | `Household/Tracking.jsx` | `/household/tracking/:id` |
| Dispatch | `Household/Dispatch.jsx` | `/household/dispatch` |
| Payment | `Household/Payment.jsx` | `/household/payment/:id` |
| Invoice | `Household/Invoice.jsx` | `/household/invoice/:id` |
| Profile | `Household/Profile.jsx` | `/household/profile` |

---

## ✅ Implemented Features

### Service Discovery
- [x] **Home Dashboard** — Welcome screen with service categories and featured providers
- [x] **Find Services** — Browse services by category with filters
- [x] **Map View** — `FindServices.jsx` List/Map toggle renders a Leaflet map (OSM tiles, lazy-loaded from CDN) with a marker per provider that has real `geoLocation.lat/lng`, popups, and auto-fit bounds (centers on the household's GPS when available).
- [x] **Provider Profile View** — See provider rating, skills, trust score, cooperative
- [x] **Cooperative Marquee Ticker** — `CoopMarqueeTicker.jsx` shows active cooperatives
- [x] **AI Voice Search** — Voice-powered service search via `AIVoiceSearchModal`
- [x] **Favourites / Saved Providers** — Bookmark preferred providers (`FavoriteButton.jsx` on provider cards + `SavedProviders.jsx` at `/household/saved`)
- [x] **Geo-fenced Provider Matching** — `FindServices.jsx` location bar requests the household's GPS, sends `lat`/`lng`/`radius` to `/providers` (server Haversine filter), shows distance badges on cards, sorts nearest-first, and lets the user adjust the radius (5–50 km).
- [x] **Advanced Filters** — `FindServices.jsx` "Filters" panel: verified-only toggle, minimum rating (3.0–4.5★), max hourly rate, specific cooperative (populated from `/providers/cooperatives`), and "available today" (matched against the provider's `availabilitySlots.day`). An active-filter badge and "Clear all" shortcut are included.
- [x] **Search History** — `FindServices.jsx` persists recent searches to `localStorage` (`sg_search_history`, capped at 6). Searches are captured on Enter and via voice search; recent terms render as tappable chips with per-item remove and a "Clear" action.
- [x] **AI-powered Recommendations** — `GET /api/ai/recommend` scores verified providers against the household's own booking history (service overlap, rating, completed jobs, trust) and returns a personalised list with a reason. Rendered as a "Recommended for You" section on the Household Home dashboard (`Home.jsx`).

### Booking Flow
- [x] **Booking Request** — Select date/time/service type and submit request
- [x] **Recurring Bookings** — `BookingRequest.jsx` repeats a booking daily/weekly/bi-weekly/monthly (2–24 repeats). Server stamps `seriesId`, `nextRunAt`; on completion `spawnNextOccurrence` auto-creates the next booking (series pauses if the provider is unavailable at the next slot; stops at the repeat cap). Badged in `Bookings.jsx` / `Tracking.jsx` / `JobDetail.jsx`.
- [x] **Group Booking** — `BookingRequest.jsx` lets a household book for a community/RWA: server scales `totalPrice = hourlyRate × memberCount` and stores `groupBooking.groupName/memberCount`; group badge + member count shown in bookings UI.
- [x] **Bookings List** — View all active, past, and cancelled bookings
- [x] **Live Tracking** — Real-time booking status tracking (`Tracking.jsx`); recurring/group badges + refunded banner, pay CTA correct for refunded bookings
- [x] **Dispatch Flow** — On-demand dispatch for urgent services (`Dispatch.jsx`)
- [x] **Cancel Booking** — Household can cancel before provider accepts (Cancel button on `Tracking.jsx` when status is `requested`)
- [x] **Booking Reschedule** — Change date/time to another free slot via `Tracking.jsx` (uses `/providers/:id/slots`, only while `requested`/`accepted`)
- [x] **In-app Chat with Provider** — Real-time chat on `Tracking.jsx` + `JobDetail.jsx`; sender names resolved (server populates `chat.sender`), own messages aligned right
- [x] **Rating & Review** — Post-completion rating form on the Invoice page
- [x] **Dispute Filing** — Household files a dispute from the Tracking page with a reason category, description, and optional photo/PDF evidence (stored on the booking); a "Dispute under review" banner + withdraw option appear once filed. Admins see category + preview the evidence on the Disputes page. (`FileUpload.jsx`, `Tracking.jsx`, `Disputes.jsx`)

### Payment
- [x] **Payment Page** — Razorpay checkout integration (`Payment.jsx`)
- [x] **Coupon / Promo Codes** — `SAHAKAR20`, `FIRSTGIG`, `COOP50` — end-to-end: `createOrder` honours `amountOverride`, final discounted amount persisted in the Payment ledger + invoice
- [x] **Post-Service Pay (UPI-free COD)** — "Post-Service Pay" mode: household confirms and settles after completion (keeps payment pending until then)
- [x] **Invoice View** — View invoice after job completion (`Invoice.jsx`)
- [x] **Payment History** — Past payments list in bookings
- [x] **Fair Wage Breakdown** — `FairWageBreakdown.jsx` shows how payment is split
- [x] **Wallet / Credits** — Household prepaid wallet: Razorpay top-ups (min ₹100, quick chips + custom amount), escrow-refundable balance, and **Pay from Wallet** as an instant booking payment mode (server deducts balance, releases payment, logs a debit txn).
- [x] **Spending Summary / Insights** — `GET /analytics/household`: total spent, this month, paid bookings, avg/booking, 6-month trend bars, spend-by-service breakdown, top service. Shown in the Wallet page "Insights" tab.
- [x] **Notification Preferences** — `notificationPrefs` on `/auth/me` (inApp / email / promotional toggles) in Profile → Notifications tab; server honours them in `notify` (inApp + email suppression per channel).
- [x] **Partial Refund** — Admin Disputes "Refund" resolve credits the household wallet in real time: server marks payment `refunded` (+`refundedAt`), credits `walletBalance`, writes a WalletTransaction (method `refund`), notifies `payment_released`. Household sees the credit in Wallet + a refunded banner on Tracking.
- [x] **Subscription Discount** — An active subscription (`basic` 15% / `pro` 25% / `premium` 35%) is applied server-side to `createOrder` + `wallet-pay` via `discountedAmount()`.

### Profile
- [x] **Profile Management** — Name, address, phone, email edit (real persisted data — no demo defaults)
- [x] **Address Management** — Save home/work address
- [x] **Multi-address Support** — Persisted multiple saved addresses (home, office, etc.) with add/update/delete UI in Profile → Household → Address Book (API: `GET|POST /auth/addresses`, `PATCH|DELETE /auth/addresses/:id`), primary badge, real API data.
- [x] **Family Members** — Add/edit/remove family profiles under one account in Profile → Household → Family Members (API: `GET|POST /auth/family`, `PATCH /auth/family/:id`).
- [x] **Booking History** — In profile view
- [x] **Subscription Plans** — Wallet → Plans tab: `basic` ₹199/-15%, `pro` ₹399/-25%, `premium` ₹699/-35%. Wallet-funded instant when balance covers (`paidFromWallet`), else real Razorpay order → `/subscriptions/verify`. Cancel stops auto-renew; overview returns `{ active, plans[], walletBalance }` with 30-min auto-renewal window (wallet debit or expire).

---

## API Endpoints (Household)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/providers` | Browse providers (Haversine geo-filter with `lat`/`lng`/`radius`) |
| GET | `/api/providers/:id` | View provider profile |
| GET | `/api/providers/:id/slots` | Provider availability slots |
| POST | `/api/bookings` | Create booking (accepts `recurrence` + `groupBooking`) |
| GET | `/api/bookings/household/mine` | Get own bookings |
| PATCH | `/api/bookings/:id/cancel` | Cancel booking |
| PATCH | `/api/bookings/:id/status` | Provider updates status (completion can spawn next recurring booking) |
| PATCH | `/api/bookings/:id/dispute` | File a dispute |
| PATCH | `/api/bookings/:id/withdraw-dispute` | Withdraw an open dispute |
| PATCH | `/api/bookings/:id/reschedule` | Reschedule to another free slot |
| POST | `/api/payments/create-order` | Create Razorpay order (subscription discount applied) |
| POST | `/api/payments/verify` | Verify payment & release |
| POST | `/api/payments/wallet-pay` | Pay booking instantly from wallet (subscription discount applied) |
| GET | `/api/payments/invoice/:id` | Get invoice |
| GET | `/api/wallet` | Wallet overview + transactions |
| POST | `/api/wallet/topup` | Create Razorpay top-up order |
| POST | `/api/wallet/topup/verify` | Verify top-up & credit balance |
| GET | `/api/analytics/household` | Spending summary & trends |
| GET | `/api/subscriptions` | Subscription overview + plan catalogue |
| POST | `/api/subscriptions/subscribe` | Subscribe (`wallet` if funded, else Razorpay order) |
| POST | `/api/subscriptions/verify` | Verify subscription payment |
| POST | `/api/subscriptions/cancel` | Cancel auto-renew |
| GET | `/api/auth/me` | Profile (incl. `addresses`, `familyMembers`, `notificationPrefs`) |
| PATCH | `/api/auth/me` | Update profile |
| GET/POST | `/api/auth/addresses` | List / add saved addresses |
| PATCH/DELETE | `/api/auth/addresses/:id` | Update / delete saved address |
| GET/POST | `/api/auth/family` | List / add family members |
| PATCH | `/api/auth/family/:id` | Update family member |
| GET | `/api/auth/family/:id` | View family member |
| POST | `/api/reviews` | Submit review after job |
| GET | `/api/favorites` | List saved providers |
| GET | `/api/favorites/ids` | List saved provider ids only |
| POST | `/api/favorites/:providerId` | Save a provider to favourites |
| DELETE | `/api/favorites/:providerId` | Remove a provider from favourites |
| GET | `/api/ai/recommend` | Personalised provider recommendations for the household |
