# SahakarGig — Internal Functional Specifications

> How every function works behind the scenes, including the new Federation,
> Welfare, AI, Emergency, and Invoice modules.

## 1. Authentication & RBAC (4 roles)

- Roles: `Household, Provider, Cooperative Admin, Federation Admin`.
- Signup:
  - **Federation Admin** creates a `Federation` on signup (`adminId = userId`).
  - **Cooperative Admin** creates a `Cooperative` and links `federationId`.
  - **Provider** selects an existing Cooperative from dropdown → `cooperativeId`.
  - **Household** → plain customer, no cooperative.
- JWT contains `{ userId, role }`. Middleware `authMiddleware` + `roleMiddleware([...])`
  protect routes.

---

## 2. Governance Hierarchy Functions

```
Federation.adminId → manages cooperativeIds[]
Cooperative.adminId, federationId → manages memberProviderIds[]
Provider.cooperativeId → belongs to one cooperative
```

- `GET /api/federation/:id/analytics` → aggregate across all cooperatives.
- `POST /api/federation/cooperatives` → federation admin onboards a society.

---

## 3. Service Discovery + Geo Matching

- Params: `category, lat, lng, radiusKm, minPrice, maxPrice, minRating, emergency`.
- Filter `Provider` by `skills` + `verified`.
- **Haversine** keeps providers within `radiusKm`:

```js
function haversine(a, b) {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat/2)**2 +
            Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
```

- Emergency requests sort by distance + availability first (priority).

---

## 4. Trust Score Engine (live)

```js
trustScore = (avgRating/5 * 0.5) + (completionRate * 0.3) + (verified ? 0.2 : 0)
```
Fetched from Reviews + Bookings on demand; rendered as badge.

---

## 5. Booking Flow (Normal + Emergency)

1. `POST /api/bookings` (Household) → `status: requested`, `isEmergency` flag,
   `paymentStatus: pending`. Emits `booking:new` (emergency = high-priority push).
2. `POST /api/bookings/:id/accept` (Provider) → `accepted` → emit `booking:updated`.
3. Provider → `in-progress` → `completed`.
4. Payment captured (Razorpay) → split computed → `Payment` + `Invoice` created →
   `paymentStatus: paid` → emit `booking:completed` → Review prompt.
5. Either side → `POST /api/bookings/:id/dispute` → `disputed` → Admin queue + chat log.

---

## 6. Real-Time (Socket.io)

- Rooms: `user:<id>`, `coop:<cooperativeId>`, `fed:<federationId>`.
- Events: `booking:new`, `booking:updated`, `notification`, `ai:nudge`.
- Emergency alerts use the priority channel for instant provider attention.

---

## 7. AI Demand Forecasting + Allocation

- **Forecast:** aggregate Bookings by `region` + `hourOfWeek` → rolling demand index.

```js
// pseudo: demand index for region R, hour H
const demand = await Booking.aggregate([
  { $match: { region: R } },
  { $group: { _id: { $hour: "$scheduledTime" }, count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);
// top hours = predicted peak demand windows
```

- **Allocation nudge:** find providers idle in low-demand zones during a predicted
  peak elsewhere → emit `ai:nudge`: "High demand in <zone>, 6–9 PM — open slots."
- Lightweight, rule-based now; structured so an ML model can replace the aggregate
  later.

---

## 8. Worker Welfare & Insurance Module

- `Welfare` doc per provider:
  - `eShramId` (govt labour ID), `insuranceOptIn`, `insuranceProvider`,
    `schemesEligible[]` (e.g., PM SBRY, e-Shram), `totalEarnings`, `daysWorked`.
- **welfareScore** derived from earnings consistency + days worked + insurance opt-in.
- Generates a **QR welfare card** (via `qrcode`) = formal income/coverage proof.
- Surfaced on provider profile and Coop Admin "Welfare reach" widget.

---

## 9. Notifications

- `sendNotification(userId, message)`:
  - Socket.io `notification` (in-app toast).
  - Nodemailer email on status change / dispute / emergency.
- AI nudges also routed through this helper (`ai:nudge` type).

---

## 10. Dispute Resolution

- Dispute captures `bookingId`, `raisedBy`, copied **chat log**.
- Admin views log, decides: `refunded` (Payment reversed, commissions reversed) or
  `resolved-in-favor-of-provider` (payout proceeds).
- Recorded on Booking + Dispute.

---

## 11. Invoicing

- On payment release, `generateInvoice(payment)` builds an `Invoice` doc with
  line items from Booking (service, hours × rate), optional tax, total = amount.
- Household views/downloads; provider uses it as income proof in Welfare.

---

## 12. Admin Dashboards (Recharts)

- **Cooperative Admin:** pending verifications, active disputes, revenue chart,
  provider leaderboard, welfare reach.
- **Federation Admin:** aggregated bookings/revenue across cooperatives, society
  comparison, total community income, AI demand heatmap.

---

## 13. File Uploads & i18n

- Multer + Cloudinary for verification docs + certs.
- react-i18next (`en`, `hi`, extensible) with header language toggle.
- All UI strings use translation keys.

---

## 14. PWA (Mobile Requirement)

- `manifest.json` + service worker → installable, offline shell, responsive.
- Satisfies "Multilingual mobile application" without a native build.

---

## 15. Seed Script (`server/seed.js`)

- **1 Federation**, **3 Cooperatives**, **15 Providers** (some verified),
  **10 Households**, sample Bookings across statuses, Reviews (non-zero trust),
  sample Welfare profiles, a few Invoices, and demand data for AI demo.

---

## 16. Project Structure

```
/client   React + Vite PWA (pages/, components/, i18n/, socket/, pwa/)
/server   Express (routes/ controllers/ models/ middleware/ ai/ seed.js)
/docs     HLD, PRD, BILLING, INTERNAL_FUNCTIONAL
README.md
.env.example
```
