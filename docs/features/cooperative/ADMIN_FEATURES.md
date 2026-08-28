# Admin Portal — Feature Documentation

> All features for the Platform Super-Admin portal at `/admin/*`
>
> Admin has full visibility across all cooperatives, providers, households, and bookings.

---

## Pages

| Page | File | Route |
|------|------|-------|
| Dashboard | `Admin/Dashboard.jsx` | `/admin/dashboard` |
| Providers | `Admin/Providers.jsx` | `/admin/providers` |
| Worker Detail | `Admin/WorkerDetail.jsx` | `/admin/providers/:id` |
| Verifications | `Admin/Verifications.jsx` | `/admin/verifications` |
| Disputes | `Admin/Disputes.jsx` | `/admin/disputes` |
| Commission | `Admin/Commission.jsx` | `/admin/commission` |
| Settings | `Admin/Settings.jsx` | `/admin/settings` |

---

## ✅ Implemented Features

### Dashboard
- [x] **Admin Dashboard** — Total providers, bookings, revenue, active disputes KPI cards
- [x] **Charts** — Booking trends, revenue charts (Recharts)
- [x] **Provider Leaderboard** — Top providers by rating and completions

### Provider Management
- [x] **Providers List** — Full paginated list of all providers with search + filter
- [x] **Worker Detail Page** — Deep-dive: bookings history, earnings, welfare, documents, reviews
- [x] **Provider Status Toggle** — Activate / deactivate a provider account
- [x] **Verification Approval** — Approve or reject provider verification documents

### Verifications
- [x] **Verifications Queue** — All providers with pending verification documents
- [x] **Document Review** — View uploaded documents per provider

### Disputes
- [x] **Disputes List** — All flagged bookings across the platform
- [x] **Dispute Status** — Open / investigating / resolved states

### Commission
- [x] **Commission Settings** — View and set platform-wide commission rates
- [x] **Commission Revenue** — Total commission earned by platform

### Settings
- [x] **Admin Settings Page** — Platform configuration, appearance, security
- [x] **Admin Sidebar** — `AdminSidebar.jsx` navigation

---

## ❌ Not Yet Implemented

### Dashboard
- [ ] **Real-time Live Feed** — Live booking activity feed on dashboard
- [ ] **Geographic Analytics** — Booking heatmap by region/PIN code
- [ ] **Revenue Forecasting** — ML-based revenue projection
- [ ] **Cooperative Performance Comparison** — Cross-cooperative analytics

### Provider Management
- [ ] **Bulk Actions** — Bulk verify, deactivate, or message providers
- [ ] **Provider Import** — CSV import for bulk provider onboarding
- [ ] **Background Check Integration** — Police verification API link
- [ ] **KYC API Integration** — Aadhaar/PAN verification via DigiLocker/UIDAI

### Dispute Resolution
- [ ] **Dispute Detail View** — Full chat log + evidence gallery per dispute
- [ ] **Resolution Actions** — Issue refund, penalise provider, warn household
- [ ] **Dispute Timeline** — Audit trail of dispute events
- [ ] **Auto-escalation** — Disputes open > 48h auto-escalate

### Commission & Payouts
- [ ] **Per-category Commission Rates** — Different rates per service type
- [ ] **Per-cooperative Commission Override** — Custom rates per cooperative
- [ ] **Payout Initiation** — Admin triggers batch payouts to providers via Razorpay
- [ ] **Payout Reconciliation** — Match Razorpay payout records to DB payouts

### User Management
- [ ] **Household List** — View all registered households
- [ ] **User Ban / Suspend** — Ban abusive users
- [ ] **Admin Role Management** — Create sub-admin accounts with limited scope
- [ ] **Audit Log Viewer** — View all admin actions with timestamps

### Platform Config
- [ ] **Feature Flags** — Toggle features per cooperative or region
- [ ] **Service Category Management** — Add/edit/delete service categories
- [ ] **Dynamic Pricing Config** — Set demand-surge pricing rules
- [ ] **Email Template Editor** — Edit transactional email templates

---

## API Endpoints (Admin)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/dashboard` | Platform-wide KPI stats |
| GET | `/api/admin/providers` | All providers |
| GET | `/api/admin/providers/:id` | Provider detail |
| PUT | `/api/admin/providers/:id/verify` | Verify a provider |
| PUT | `/api/admin/providers/:id/toggle` | Activate/deactivate |
| GET | `/api/admin/disputes` | All disputes |
| PUT | `/api/admin/disputes/:id` | Update dispute status |
| GET | `/api/admin/commission` | Commission settings |
| PUT | `/api/admin/commission` | Update commission rates |
