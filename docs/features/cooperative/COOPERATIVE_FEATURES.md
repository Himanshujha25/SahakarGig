# Cooperative Portal — Feature Documentation

> Dedicated Standalone Portal for individual Cooperatives (under the Federation apex network).
> Cooperative Admins manage their local workforce, document verifications, treasury ledger, member welfare fund, circular notices, and statutory compliance under `/admin/*`.

---

## Data Model

```js
// server/src/models/Cooperative.js
{
  name: String,
  registrationId: String,
  region: String,
  district: String,
  contactEmail: String,
  contactPhone: String,
  adminId: ObjectId (ref: User),
  memberProviderIds: [ObjectId (ref: Provider)],
  commissionRate: Number,
  welfareFundAllocation: Number,
  registrationDoc: { name: String, url: String, uploadedAt: Date },
  meetingMinutes: [{ title: String, date: Date, attendeesCount: Number, summary: String, docUrl: String }],
  grievances: [{ complainantName: String, category: String, description: String, status: String, filedAt: Date, resolvedAt: Date, resolutionNote: String }],
  annualReturns: [{ financialYear: String, filingDate: Date, ackNumber: String, status: String, docUrl: String }],
  notices: [{ title: String, content: String, category: String, priority: String, postedAt: Date, postedBy: String }],
  status: 'active' | 'pending' | 'suspended',
  inviteCode: String
}
```

---

## ✅ Implemented Features

### 1. Cooperative Self-Management
- [x] **Standalone Cooperative Admin Portal** — Dedicated dashboard (`/admin`) separate from federation-level view
- [x] **Member Management** — Add/remove providers from cooperative via UI and direct link (`/admin/providers`)
- [x] **Cooperative Profile Editing** — Update cooperative name, region, district, contact phone and email
- [x] **Registration Document Upload** — Upload & preview society registration certificate

### 2. Member Verification
- [x] **Verification Workflow** — Cooperative admin reviews, approves, and rejects new provider applications (`/admin/verifications`)
- [x] **Document Viewer** — Inspect uploaded Aadhaar, e-Shram, PAN, and Trade Skill certificates with digital stamping
- [x] **Verification History** — Complete audit trail of who verified/rejected which provider with timestamps & notes

### 3. Financials & Treasury
- [x] **Commission Dashboard** — Per-cooperative commission income from completed bookings (`/admin/financials`)
- [x] **Welfare Fund Management** — Configurable % allocation of commission to member social security & welfare
- [x] **Member Payout Management** — Initiate direct member payouts via Razorpay Escrow / Bank NEFT
- [x] **Account Ledger** — Real-time booking disbursal ledger with printable financial statement

### 4. Communication & Governance
- [x] **Internal Notice Board** — Broadcast circulars and announcements to member providers with push notifications (`/admin/notices`)
- [x] **Member Messaging** — Direct SMS & in-app broadcast alerts
- [x] **Meeting Minutes** — Record & store General Assembly / Executive Committee meeting minutes

### 5. Compliance & Dispute Resolution
- [x] **Audit Reports** — Real-time Ministry of Cooperation audit score and statutory checklist (`/admin/compliance`)
- [x] **Annual Return Filing** — Track annual return submissions and Registrar filing acknowledgments
- [x] **Grievance Register** — Digital grievance register with status tracking and resolution notes
- [x] **Cooperative Disputes** — Resolve member dispute cases with refund or settlement actions (`/admin/disputes`)

---

## Relationship Diagram

```
Federation (1) ──────── has many ──────── Cooperatives (N)
Cooperative (1) ──────── has many ──────── Providers (N)
Provider (1)    ──────── has many ──────── Bookings (N)
Booking (1)     ──────── generates ─────── Payment (1)
Payment (1)     ──────── splits into ───── cooperativeCommission + providerPayout + federationCommission
```

---

## Cooperative Portal Routes

| Page | Route | Purpose |
| :--- | :--- | :--- |
| **Dashboard** | `/admin` | Cooperative overview, live booking metrics, workforce summary |
| **Members** | `/admin/providers` | Roster of verified workers, add/remove members, WhatsApp invites |
| **Verifications** | `/admin/verifications` | Document inspection viewer, re-verification trigger, audit trail |
| **Financials** | `/admin/financials` | Commission revenue, welfare allocation, member payouts, ledger |
| **Notice Board** | `/admin/notices` | Member circulars, urgent broadcasts, General Body meeting minutes |
| **Compliance** | `/admin/compliance` | Ministry audit scores, Annual Return filing archive, grievance register |
| **Disputes** | `/admin/disputes` | Cooperative customer dispute tribunal & refunds |
| **Settings** | `/admin/settings` | Cooperative profile editing, registration doc upload, security |
