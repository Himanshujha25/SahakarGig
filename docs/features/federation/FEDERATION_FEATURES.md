# Federation Portal — Feature Documentation

> All features for the Cooperative Federation (role: `cooperative`) portal at `/federation/*`
>
> The Federation portal is used by cooperative society admins to manage their member providers, resolve disputes, and track community earnings.

---

## Pages

| Page | File | Route |
|------|------|-------|
| Dashboard | `Federation/Dashboard.jsx` | `/federation/dashboard` |
| Cooperatives | `Federation/Cooperatives.jsx` | `/federation/cooperatives` |
| Cooperative Detail | `Federation/CooperativeDetail.jsx` | `/federation/cooperatives/:id` |
| Earnings | `Federation/Earnings.jsx` | `/federation/earnings` |
| Settings | `Federation/Settings.jsx` | `/federation/settings` |

---

## ✅ Implemented Features

### Dashboard
- [x] **Federation Dashboard** — Overview of total members, active bookings, revenue
- [x] **Cooperative List** — View all cooperatives under the federation

### Cooperative Management
- [x] **Cooperatives Page** — List all registered cooperatives with stats
- [x] **Cooperative Detail** — Deep-dive into a single cooperative: members, bookings, earnings
- [x] **Coop Marquee Ticker** — `CoopMarqueeTicker.jsx` live ticker of cooperative activity

### Earnings
- [x] **Federation Earnings Page** — Commission income, total distributed to providers
- [x] **Payout Tracking** — View payouts issued to member providers

### Settings
- [x] **Settings Page** — Federation profile, commission rate config, appearance
- [x] **Appearance Settings** — Integrated theme picker
- [x] **Account Security** — Password change tab

---

## ❌ Not Yet Implemented

### Cooperative Management
- [ ] **Register New Cooperative** — Admin creates a new cooperative from UI
- [ ] **Cooperative Approval Flow** — Platform admin approves cooperative registration
- [ ] **Deactivate Cooperative** — Suspend a non-compliant cooperative
- [ ] **Member Invite** — Send invite link to provider to join cooperative
- [ ] **Cooperative KPI Report** — Downloadable PDF report of monthly KPIs

### Provider Verification (via Federation)
- [ ] **Verification Queue** — Review and approve pending provider verification docs
- [ ] **Document Viewer** — Preview uploaded Aadhaar / PAN / certificates in-app
- [ ] **Re-verification Trigger** — Force a provider to re-submit documents
- [ ] **Bulk Approve** — Bulk-verify multiple providers in one action

### Dispute Resolution
- [ ] **Dispute Queue** — View disputes raised by household or provider
- [ ] **Dispute Detail** — Review chat log + evidence + resolution options
- [ ] **Arbitration Decision** — Mark dispute resolved / refund issued / penalty applied
- [ ] **Escalation to Platform Admin** — Escalate to super-admin if unresolvable

### Announcements
- [ ] **Create Announcement** — Federation posts an announcement to all providers
- [ ] **Schedule Announcement** — Set a future publish date for announcement
- [ ] **Targeted Announcement** — Send to specific cooperatives or skill categories

### Earnings & Finance
- [ ] **Commission Rate Configuration** — Set per-service-category commission %
- [ ] **Payout Initiation** — Trigger actual Razorpay payout to providers
- [ ] **Monthly Statement** — Generate and download monthly earnings PDF
- [ ] **Tax Compliance Report** — TDS deduction summary for IT filing
- [ ] **Welfare Fund Allocation** — Allocate % of commission to welfare fund

### Analytics
- [ ] **Charts / Graphs** — Recharts dashboard with bookings over time, top services
- [ ] **Provider Leaderboard** — Top performers by rating, completions, earnings
- [ ] **Geographic Heatmap** — Booking density by area/PIN code

---

## API Endpoints (Federation)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/federation/dashboard` | Federation dashboard stats |
| GET | `/api/federation/cooperatives` | List cooperatives |
| GET | `/api/federation/cooperatives/:id` | Cooperative detail |
| GET | `/api/federation/earnings` | Earnings breakdown |
| PUT | `/api/federation/settings` | Update federation settings |
| GET | `/api/federation/providers/pending` | Providers awaiting verification |
| PUT | `/api/federation/providers/:id/verify` | Approve provider |
