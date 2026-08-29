# Federation Portal — Feature Documentation

> All features for the Cooperative Federation (role: `Federation Admin`) portal at `/federation/*`
>
> The Federation portal is used by apex cooperative federation administrators to oversee member cooperative societies, arbitrate disputes, audit gig worker credentials, manage tax compliance (TDS u/s 194O), configure category commissions, disburse payouts, and broadcast policy circulars.

---

## Pages

| Page | File | Route |
|------|------|-------|
| Dashboard | `Federation/Dashboard.jsx` | `/federation` |
| Cooperatives Directory | `Federation/Cooperatives.jsx` | `/federation/cooperatives` |
| Cooperative Detail | `Federation/CooperativeDetail.jsx` | `/federation/cooperatives/:id` |
| Provider Verifications | `Federation/Verifications.jsx` | `/federation/verifications` |
| Dispute Arbitration Tribunal | `Federation/Disputes.jsx` | `/federation/disputes` |
| Broadcast Announcements | `Federation/Announcements.jsx` | `/federation/announcements` |
| Earnings, Payouts & Tax | `Federation/Earnings.jsx` | `/federation/earnings` |
| Market Analytics & Heatmap | `Federation/Analytics.jsx` | `/federation/analytics` |
| Settings | `Federation/Settings.jsx` | `/federation/settings` |

---

## ✅ Implemented Features

### Cooperative Management
- [x] **Register New Cooperative** — Federation admin can register a new primary cooperative with legal name, registration ID, jurisdiction region, contact information, and initial commission %.
- [x] **Cooperative Approval Flow** — Active, pending, and suspended status tracking with audit history.
- [x] **Deactivate / Suspend Cooperative** — Instant suspension / reactivation action button with mandatory reason recording.
- [x] **Member Invite** — Generate unique onboarding invite links and WhatsApp sharing integration for prospective member gig workers.
- [x] **Cooperative KPI Report** — Downloadable JSON/PDF monthly report tracking GMV, member counts, verified ratio, dispute rates, and trust scores.

### Provider Verification (via Federation)
- [x] **Verification Queue** — Comprehensive regulatory review table of all pending provider credentials across member cooperatives.
- [x] **Document Viewer** — In-app encrypted preview modal for Aadhaar, e-Shram cards, PAN, and trade skill certifications.
- [x] **Re-verification Trigger** — Instant "Request Document Re-Upload" action with custom note and automated push notification to the worker.
- [x] **Bulk Approve** — 1-click bulk verification for multiple selected gig workers.

### Dispute Resolution & Arbitration
- [x] **Dispute Queue** — Real-time filterable queue (Open, Investigating, Resolved, Escalated) across all member cooperatives.
- [x] **Dispute Detail** — In-depth case viewer with dispute category, complainant details, evidence links, and in-booking chat history.
- [x] **Arbitration Decision** — Legally binding arbitration actions: Full/Partial Refund to Customer, Release Escrow to Provider, Worker Penalty Deduction, or Formal Warning.
- [x] **Escalation to Platform Admin** — Escalate complex disputes to Ministry/Platform Super-Admin with case summary.

### Announcements & Circulars
- [x] **Create Announcement** — Rich circular composer with category tags (Official Notice, Govt Scheme, Safety Alert, Bonus Incentive).
- [x] **Schedule Announcement** — Schedule announcements for future date/time publishing or instant broadcast.
- [x] **Targeted Announcement** — Precise audience targeting (All Cooperatives, Filter by specific Society, or Filter by Worker Trade Skills).

### Earnings, Payouts & Tax Compliance
- [x] **Commission Rate Configuration** — Configurable default commission % and per-service-category commission overrides.
- [x] **Payout Initiation** — One-click batch provider payout disbursal via Razorpay Route API integration.
- [x] **Monthly Statement** — Printable and downloadable monthly financial statement (GMV, Commission, Coop Share, Worker Payouts).
- [x] **Tax Compliance Report (TDS)** — Section 194O 1% TDS calculation and Form 26AS statutory deduction summary.
- [x] **Welfare Fund Allocation** — Direct percentage allocation (10%) from federation revenue into the Cooperative Social Security & Insurance Reserve Fund.

### Market Analytics & Business Intelligence
- [x] **Charts / Graphs** — Interactive Recharts dashboard with monthly booking volume, GMV growth trends, and service category demand distribution.
- [x] **Provider Leaderboard** — Top 10 high-performing gig workers ranked by trust scores, completed jobs, and earnings.
- [x] **Geographic Heatmap** — District and PIN-code demand density table with live response times and worker concentration.

---

## API Endpoints (Federation)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/federation/dashboard` | Aggregated dashboard KPI stats across all cooperatives |
| GET | `/api/federation/cooperatives` | List member cooperatives with provider counts & invite URLs |
| POST | `/api/federation/cooperatives/register` | Register and onboard a new primary cooperative |
| POST | `/api/federation/cooperatives/onboard` | Link existing cooperative by MongoDB ID |
| GET | `/api/federation/cooperatives/kpi-report` | Export comprehensive monthly KPI summary report |
| GET | `/api/federation/cooperatives/:id` | Cooperative profile with providers, payouts, and bookings |
| PATCH | `/api/federation/cooperatives/:id/status` | Update cooperative status (active/suspended) with reason |
| PATCH | `/api/federation/cooperatives/:id/commission` | Update cooperative commission rate |
| GET | `/api/federation/cooperatives/:id/invite` | Generate member onboarding invite link & QR payload |
| GET | `/api/federation/verifications` | Provider verification queue with document details |
| POST | `/api/federation/verifications/bulk-verify` | Bulk approve selected provider verifications |
| PATCH | `/api/federation/verifications/:id/verify` | Approve or reject single provider verification |
| PATCH | `/api/federation/verifications/:id/re-verify` | Request document re-upload with custom reason |
| GET | `/api/federation/disputes` | List active and historical disputed bookings |
| GET | `/api/federation/disputes/:id` | Detailed dispute record with chat log & evidence |
| POST | `/api/federation/disputes/:id/resolve` | Execute arbitration order (refund, payout, penalty, warning) |
| POST | `/api/federation/disputes/:id/escalate` | Escalate dispute to Ministry Platform Super-Admin |
| GET | `/api/federation/announcements` | List published and scheduled announcements |
| POST | `/api/federation/announcements` | Create/schedule targeted broadcast announcement |
| DELETE | `/api/federation/announcements/:id` | Remove/archive announcement |
| GET | `/api/federation/finance` | Treasury summary: GMV, commission, TDS u/s 194O, welfare fund |
| PATCH | `/api/federation/finance/settings` | Update commission rates, category overrides, welfare %, TDS % |
| POST | `/api/federation/finance/payouts/batch` | Initiate batch Razorpay provider escrow payouts |
| GET | `/api/federation/finance/statement` | Generate monthly structured earnings statement |
| GET | `/api/federation/analytics` | Fetch monthly trends, category shares, leaderboard, and heatmap |
