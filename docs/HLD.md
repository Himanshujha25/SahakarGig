# SahakarGig — High-Level Design (HLD)

> Aligned to **SIH Problem Statement 26089 — Cooperative Gig Services Platform for
> Household & Community Services**. Plain-English architecture for developers,
> reviewers, and judges.

## 1. Problem We Solve (PS 26089)

Labour Cooperative Federations and Societies hold a large pool of skilled workers
(electricians, plumbers, carpenters, painters, domestic helpers, caregivers,
drivers, gardeners, cleaners, technicians) but **lack a structured digital platform**
to connect them with households/institutions. Private platforms dominate; cooperative
workers stay underutilized despite local presence and skills.

**Our answer:** a **cooperative-owned** marketplace with verification, fair wages,
worker welfare, and consumer trust — governed by the cooperative itself.

---

## 2. The Five Layers

```
┌──────────────────────────────────────────────────────────────────┐
│  LAYER 1: CLIENT (React + Vite + Tailwind, shipped as PWA)        │
│  Role views: Household / Provider / Coop Admin / Federation Admin │
│  REST (Axios) + Real-time (Socket.io) + Offline-capable PWA       │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTPS / REST + WebSocket
┌───────────────────────────┴──────────────────────────────────────┐
│  LAYER 2: API (Node.js + Express, JWT + RBAC)                     │
│  /api/auth /api/bookings /api/providers /api/federation /api/...  │
├──────────────────────────────────────────────────────────────────┤
│  LAYER 3: REAL-TIME (Socket.io)                                   │
│  Live booking status, emergency alerts, AI allocation nudges      │
├──────────────────────────────────────────────────────────────────┤
│  LAYER 4: INTELLIGENCE (AI Demand Forecasting + Trust Engine)     │
│  Demand prediction per region/time + workforce allocation nudges  │
├──────────────────────────────────────────────────────────────────┤
│  LAYER 5: DATA (MongoDB + Mongoose)                               │
│  Federation→Cooperative→Provider→Booking→Payment→Invoice→Welfare  │
└──────────────────────────────────────────────────────────────────┘
```

- **PWA** satisfies the "Multilingual mobile application" requirement without a
  separate native app (installable, offline shell, responsive).
- **AI layer** (Layer 4) meets the explicit "AI-based demand forecasting and
  workforce allocation" requirement.

---

## 3. Governance Hierarchy (New — Federation Layer)

PS 26089 mentions **Federations** and **Societies**. We model a 3-tier governance:

```
Federation (e.g., State Labour Coop Federation)
   ├── Cooperative A (society)   ── adminId, federationId
   │      ├── Provider 1 (userId, cooperativeId)
   │      └── Provider 2
   └── Cooperative B
          └── Provider 3
```

- **Federation Admin** oversees all societies (aggregated analytics, onboarding
  cooperatives).
- **Cooperative Admin** manages their own society's providers, verifications,
  disputes, commission.

---

## 4. Data Models

| Model         | Key Fields                                                                 |
|---------------|----------------------------------------------------------------------------|
| **User**      | name, phone, email, role, passwordHash, address, geoLocation               |
| **Federation**| name, registrationId, region, adminId, cooperativeIds[]                    |
| **Cooperative**| name, registrationId, region, adminId, federationId, memberProviderIds[], commissionRate |
| **Provider**  | userId, cooperativeId, skills[], hourlyRate, verified, trustScore, availabilitySlots[], documents[], insuranceOptIn |
| **Booking**   | householdId, providerId, service, scheduledTime, status, price, paymentStatus, isEmergency, priority |
| **Review**    | bookingId, rating (1-5), comment, createdBy                                 |
| **Payment**   | bookingId, amount, cooperativeCommission, federationCommission, providerPayout, status |
| **Invoice**   | invoiceNumber, bookingId, paymentId, householdId, providerId, cooperativeId, items[], tax, total, generatedAt |
| **Welfare**   | providerId, eShramId, insuranceOptIn, insuranceProvider, schemesEligible[], totalEarnings, daysWorked, welfareScore |

---

## 5. Booking Lifecycle (Normal + Emergency)

```
 requested
    │  household creates booking (isEmergency? → priority queue)
    ▼
 [ Provider notified via Socket.io — emergency = push + SMS-style alert ]
    │
    ├── reject ───────────────► cancelled
    └── accept ──► in-progress ──► completed ──► payment + invoice ──► review
                                                        │
                                                        └──► disputed ──► admin queue
```

Emergency bookings get a **priority badge** and are matched to the nearest available
provider first (geo + availability).

---

## 6. Trust Score (Consumer Trust)

```
Trust Score = (avg rating × 0.5) + (completion rate × 0.3) + (cooperative verification × 0.2)
```

Computed live, shown as a badge. This is the cooperative accountability layer
private platforms lack.

---

## 7. AI Demand Forecasting + Workforce Allocation

- Aggregate historical bookings by `region` + `hour/day` → predict **peak demand
  windows** (e.g., "Sector 12, 6–9 PM, high demand for electricians").
- **Allocation nudge:** idle providers in low-demand zones get a Socket.io
  notification suggesting they move toward / open slots in high-demand zones.
- Rule-based + lightweight ML-ready; no heavy infra.

---

## 8. Worker Welfare & Insurance (Differentiator)

- Each provider has a **Welfare** profile: links e-Shram ID, insurance opt-in,
  eligible govt schemes, earnings, days worked.
- Generates a **welfare/insurance card** (QR) — formal income proof.
- Directly supports Ministry of Cooperation "Sahakar se Samriddhi" vision.

---

## 9. External Integrations

- **Razorpay** (test mode) — payments + invoicing.
- **Nodemailer** — email notifications.
- **Multer + Cloudinary** — verification docs.
- **react-i18next** — multilingual (English/Hindi + extensible).
- **Recharts** — dashboards (coop + federation).
- **qrcode** — provider ID + welfare card.
- **PWA service worker** — installable mobile experience.

---

## 10. Build Priority

1. Auth + RBAC (4 roles incl. Federation Admin)
2. Booking flow (normal + emergency) with live status
3. Admin + Federation dashboards
4. Trust score badge
5. Notifications + Invoicing
6. Welfare/Insurance module
7. AI demand forecasting + allocation

---

## 11. Related Docs

- **PRD.md** — product + all 12 official PS features mapped.
- **BILLING.md** — commission split (federation + cooperative + provider) + invoicing.
- **INTERNAL_FUNCTIONAL.md** — how every function works behind the scenes.
