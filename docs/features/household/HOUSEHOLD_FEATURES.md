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
- [x] **Provider Profile View** — See provider rating, skills, trust score, cooperative
- [x] **Cooperative Marquee Ticker** — `CoopMarqueeTicker.jsx` shows active cooperatives
- [x] **AI Voice Search** — Voice-powered service search via `AIVoiceSearchModal`

### Booking Flow
- [x] **Booking Request** — Select date/time/service type and submit request
- [x] **Bookings List** — View all active, past, and cancelled bookings
- [x] **Live Tracking** — Real-time booking status tracking (`Tracking.jsx`)
- [x] **Dispatch Flow** — On-demand dispatch for urgent services (`Dispatch.jsx`)
- [x] **Cancel Booking** — Household can cancel before provider accepts

### Payment
- [x] **Payment Page** — Razorpay checkout integration (`Payment.jsx`)
- [x] **Invoice View** — View invoice after job completion (`Invoice.jsx`)
- [x] **Payment History** — Past payments list in bookings
- [x] **Fair Wage Breakdown** — `FairWageBreakdown.jsx` shows how payment is split

### Profile
- [x] **Profile Management** — Name, address, phone, email edit
- [x] **Address Management** — Save home/work address
- [x] **Booking History** — In profile view

---

## ❌ Not Yet Implemented

### Service Discovery
- [ ] **Geo-fenced Provider Matching** — Show only providers within X km (Haversine, in PRD)
- [ ] **Map View** — Google Maps / Leaflet map showing nearby providers
- [ ] **Advanced Filters** — Filter by availability today, price range, specific cooperative
- [ ] **Favourites / Saved Providers** — Bookmark preferred providers
- [ ] **Search History** — Show recently searched services
- [ ] **AI-powered Recommendations** — Personalised provider suggestions

### Booking Flow
- [ ] **In-app Chat with Provider** — Direct messaging during active booking
- [ ] **Booking Reschedule** — Change date/time after booking is accepted
- [ ] **Recurring Bookings** — Weekly/monthly repeat bookings
- [ ] **Group Booking** — Book for a community/building society
- [ ] **Dispute Filing** — Flag a booking as disputed with evidence upload
- [ ] **Rating & Review** — Post-completion rating form (only API exists, no UI flow)

### Payment
- [ ] **Wallet / Credits** — Household wallet top-up and usage
- [ ] **Coupon / Promo Codes** — Discount codes from cooperatives
- [ ] **Partial Refund** — Refund on disputed/cancelled booking
- [ ] **UPI / Net Banking** — Additional payment methods beyond card
- [ ] **Subscription Plans** — Monthly service plans for recurring needs

### Profile
- [ ] **Multi-address Support** — Multiple saved addresses (home, office, etc.)
- [ ] **Family Members** — Add family profiles under one account
- [ ] **Spending Summary** — Monthly expense report
- [ ] **Notification Preferences** — Choose which notifications to receive

---

## API Endpoints (Household)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/providers` | Browse providers |
| GET | `/api/providers/:id` | View provider profile |
| POST | `/api/bookings` | Create booking request |
| GET | `/api/bookings/my` | Get own bookings |
| PUT | `/api/bookings/:id/cancel` | Cancel booking |
| POST | `/api/payments/create-order` | Create Razorpay order |
| POST | `/api/payments/verify` | Verify payment |
| GET | `/api/payments/invoice/:id` | Get invoice |
| POST | `/api/reviews` | Submit review after job |
