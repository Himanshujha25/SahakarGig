# SahakarGig — Product Requirements Document (PRD)

> Mapped to **SIH PS 26089**. Every official "Expected Solution Feature" is covered
> below, plus our unique value-adds.

## 1. Problem Statement (Official, PS 26089)

> Labour Cooperative Federations and Societies possess a large pool of skilled
> workers (electricians, plumbers, carpenters, painters, domestic helpers,
> caregivers, drivers, gardeners, cleaners, technicians) but lack a structured
> digital platform to connect them with households/institutions. Private platforms
> dominate; cooperative workers remain underutilized despite skills and local
> presence.
>
> **Goal:** a cooperative-owned digital service marketplace ensuring fair wages,
> worker welfare, and consumer trust.

---

## 2. Personas (4 roles)

| Persona             | Goal                                                                 |
|---------------------|----------------------------------------------------------------------|
| **Household**       | Book verified providers (incl. emergency), pay, rate.                |
| **Service Provider**| Get discovered, accept jobs, earn, build trust + welfare profile.    |
| **Cooperative Admin**| Verify members, resolve disputes, track society income.            |
| **Federation Admin**| Oversee all cooperatives, aggregate analytics, onboard societies.   |

---

## 3. Feature Coverage vs PS 26089

| # | Official Expected Feature                         | How SahakarGig Delivers                    | Status |
|---|--------------------------------------------------|--------------------------------------------|--------|
| 1 | Provider registration & verification             | Provider signup + doc upload + admin verify| ✅ |
| 2 | Worker skill profiling & certification           | skills[], documents[], cert upload         | ✅ |
| 3 | Customer booking & scheduling                    | Booking lifecycle + availability slots     | ✅ |
| 4 | Geo-location based service matching              | Haversine radius filter                    | ✅ |
| 5 | Digital payments & invoicing                     | Razorpay + Invoice model (PDF/in-app)      | ✅ |
| 6 | Rating & feedback                                | Review + live Trust Score badge            | ✅ |
| 7 | **Worker welfare & insurance integration**       | Welfare model: e-Shram, insurance, schemes | ✅ *added* |
| 8 | **Emergency & on-demand booking**                | isEmergency priority queue + alerts        | ✅ *added* |
| 9 | Cooperative federation admin dashboard           | Federation Admin + Coop Admin dashboards   | ✅ |
|10 | Multilingual mobile application                  | react-i18next + PWA (installable mobile)   | ✅ |
|11 | **AI demand forecasting & allocation**           | Demand prediction + provider nudge         | ✅ *added* |
|12 | Tech: Mobile/AI/Geo/Payment/Cloud                | PWA + AI layer + Haversine + Razorpay + cloud| ✅ |

---

## 4. User Stories

### Household
- Sign up/login; search/filter providers by category, location, price, rating.
- Book normal **or emergency**; see live status; pay; get invoice; rate.
- Raise a dispute with chat log.

### Service Provider
- Register under a cooperative; upload skill certs + ID (verification docs).
- Accept/reject bookings (emergency shown first); view earnings + trust score.
- Maintain **Welfare profile** (e-Shram, insurance); receive AI demand nudges.

### Cooperative Admin
- Verify providers; monitor disputes; set commission; view society dashboard
  (revenue, leaderboard, active workers).

### Federation Admin
- Onboard cooperatives; view aggregated analytics across all societies;
  track total community income and welfare reach.

---

## 5. Unique Value (Why We Win vs Private Platforms)

1. **Cooperative-owned + governed** — accountability private apps can't claim.
2. **Worker Welfare & Insurance** — formal income proof, e-Shram, schemes.
3. **AI demand forecasting** — reduces idle time, raises worker earnings.
4. **Federation visibility** — scales to India's thousands of societies.

---

## 6. Non-Functional

- MERN stack, open source, low infra cost, cloud-deployable.
- PWA for mobile; JWT + RBAC security; bcrypt password hashing.
- Mock Razorpay acceptable for demo.

---

## 7. Revenue Model

Per booking: `amount = federationCommission + cooperativeCommission + providerPayout`.
See **BILLING.md** for exact split and invoicing.
