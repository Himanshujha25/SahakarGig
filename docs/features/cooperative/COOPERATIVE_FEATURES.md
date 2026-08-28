# Cooperative Portal — Feature Documentation

> Features specific to an individual Cooperative (sub-unit under a Federation).
> In the current codebase, cooperative admin actions are handled within the **Federation portal** (`/federation/*`).
> This document covers cooperative-specific concerns, models, and planned standalone portal.

---

## Current State

The `Cooperative` model exists (`server/src/models/Cooperative.js`) and cooperatives are
browseable via `Federation/Cooperatives.jsx` and `Federation/CooperativeDetail.jsx`.

There is currently **no standalone cooperative portal** — cooperative admins log in
under the `cooperative` role and are routed to `/federation/*`.

---

## Data Model

```js
// server/src/models/Cooperative.js
{
  name: String,
  registrationId: String,
  region: String,
  adminId: ObjectId (ref: User),
  memberProviderIds: [ObjectId (ref: Provider)]
}
```

---

## ✅ Implemented Features

- [x] **Cooperative Model** — DB schema with name, registrationId, region, admin, members
- [x] **Cooperative Listing** — View all cooperatives in Federation portal
- [x] **Cooperative Detail Page** — Members list, stats, booking history per cooperative
- [x] **Provider Membership** — Providers are associated with a cooperative via `cooperativeId`
- [x] **Trust Score Integration** — Cooperative verification adds 0.2 weight to trust score
- [x] **Commission Model** — `Payment.js` stores `cooperativeCommission` per booking

---

## ❌ Not Yet Implemented

### Cooperative Self-Management
- [ ] **Standalone Cooperative Admin Portal** — Separate dashboard from federation-level view
- [ ] **Member Management** — Add/remove providers from cooperative via UI
- [ ] **Cooperative Profile Editing** — Update cooperative name, region, contact details
- [ ] **Registration Document Upload** — Upload cooperative registration certificate

### Member Verification
- [ ] **Verification Workflow** — Cooperative admin reviews and approves new provider docs
- [ ] **Document Viewer** — View uploaded Aadhaar, PAN, certificates
- [ ] **Verification History** — Audit trail of who verified which provider

### Financials
- [ ] **Commission Dashboard** — Per-cooperative commission income from bookings
- [ ] **Welfare Fund Management** — Allocate % of commission to member welfare
- [ ] **Member Payout Management** — Initiate payouts to individual members
- [ ] **Account Ledger** — Full cooperative financial ledger

### Communication
- [ ] **Internal Notice Board** — Post notices visible only to cooperative members
- [ ] **Member Messaging** — Cooperative admin to provider messaging
- [ ] **Meeting Minutes** — Upload/share cooperative meeting records

### Compliance
- [ ] **Audit Reports** — Generate compliance reports for Ministry of Cooperation
- [ ] **Annual Return Filing** — Assistance with cooperative annual returns
- [ ] **Grievance Register** — Maintain digital grievance register per cooperative

---

## Relationship Diagram

```
Federation (1) ──────── has many ──────── Cooperatives (N)
Cooperative (1) ──────── has many ──────── Providers (N)
Provider (1)    ──────── has many ──────── Bookings (N)
Booking (1)     ──────── generates ─────── Payment (1)
Payment (1)     ──────── splits into ───── cooperativeCommission + providerPayout
```

---

## Planned: Standalone Cooperative Portal

Future routes would be at `/cooperative/*` with pages:

| Planned Page | Route | Purpose |
|-------------|-------|---------|
| Dashboard | `/cooperative/dashboard` | Members, bookings, revenue |
| Members | `/cooperative/members` | Manage provider members |
| Verification Queue | `/cooperative/verify` | Approve docs |
| Financials | `/cooperative/finance` | Ledger + payouts |
| Notices | `/cooperative/notices` | Announcements board |
| Disputes | `/cooperative/disputes` | Cooperative-level disputes |
