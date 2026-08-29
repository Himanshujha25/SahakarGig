# Provider Portal — Feature Documentation

> All features for the Service Provider (Gig Worker) portal at `/provider/*`

---

## Pages

| Page | File | Route |
|------|------|-------|
| Job Queue | `Provider/JobQueue.jsx` | `/provider` |
| Job Detail & Live Tracking | `Provider/JobDetail.jsx` | `/provider/job/:id` |
| Dispatch Feed | `Provider/DispatchFeed.jsx` | `/provider/dispatch` |
| Earnings & Wallet | `Provider/Earnings.jsx` | `/provider/earnings` |
| Welfare & Schemes | `Provider/Welfare.jsx` | `/provider/welfare` |
| Skill Academy | `Provider/Training.jsx` | `/provider/training` |
| Announcements | `Provider/Announcements.jsx` | `/provider/announcements` |
| Profile & ID Card | `Provider/Profile.jsx` | `/provider/profile` |

---

## ✅ Implemented Features (100% Complete)

### Job Management
- [x] **Job Queue** — Live incoming, active, and past bookings with KPI summaries and status filters
- [x] **Real-time Job Arrival** — Socket.io push when new job is matched or dispatched
- [x] **Accept / Reject Jobs** — Instant 1-click booking confirmation
- [x] **Job Detail Page** — Full booking details, customer info, service specs, OTP verification
- [x] **In-app Chat with Household** — Live real-time messaging during active bookings via Socket.io
- [x] **Live GPS Geolocation Tracking** — Real-time position emitter for household tracking
- [x] **Job Status Updates** — Mark job as in-progress, completed via OTP verification
- [x] **Dispatch Feed** — Real-time live feed of nearby/available emergency dispatch jobs
- [x] **Job History & Service Ledger** — Full audit trail of completed and settled orders

### Earnings & Wallet
- [x] **Earnings Dashboard** — Real 85% net take-home calculation (after cooperative/federation split)
- [x] **Payout History & Ledger** — List of past payouts with amounts, dates, and receipt references
- [x] **Instant Bank / UPI Disbursals** — Direct cashout requests with automated receipt generation
- [x] **Earnings Breakdown** — Transparent fee split (85% Worker, 10% Society Welfare Reserve, 5% Fed)
- [x] **Payout Model** — Complete `server/src/models/Payout.js` with receipt generator

### Worker Welfare & Social Security Trust
- [x] **Welfare Hub** — Direct access to active cooperative welfare schemes
- [x] **1-Click Scheme Application** — File tool subsidy, medical relief, and education grant claims
- [x] **Single Active Claim Policy** — Server-enforced anti-duplication rule
- [x] **Live Claim Review Tracking** — Real-time status (`Under Review`, `Approved`, `Disbursed ✓`)
- [x] **Official Verifiable Digital PDF Certificate** — Cryptographic certificate with QR verification seal
- [x] **e-Shram Universal Account Number (UAN)** — Ministry of Labour verified integration
- [x] **PMSBY Accidental Insurance** — ₹2,00,000 accidental coverage integration

### Sahakar Academy & Training
- [x] **Skill Certification Hub** — NSDC & Ministry of Cooperation aligned upskilling
- [x] **Interactive Course Player** — Video simulations and lesson completion workflows
- [x] **Digital Skill Badges** — Certified credentials automatically boosted to worker trust profile
- [x] **Printable Skill Certificates** — Official verifiable training certificates

### Profile & Identity
- [x] **Profile Management** — Name, phone, skills, hourly rate, bio, day-wise availability scheduler
- [x] **Photo & Document Upload** — Multer server-side disk storage and circular crop preview
- [x] **Doorstep Digital QR ID Card** — High-security scannable credential for household doorstep verification
- [x] **Cooperative Association** — Primary society name, registration ID, and district link
- [x] **Trust Score Engine** — Dynamic score computed from ratings, completion rate, and skill badges

### Announcements & Communication
- [x] **Broadcast Announcements** — Real-time notices from cooperative and federation admins
- [x] **Read/Unread Status** — LocalStorage and MongoDB synchronized feed

---

## API Endpoints (Provider)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/providers/me` | Get authenticated provider profile |
| PATCH | `/api/providers/:id` | Update profile, skills, availability |
| POST | `/api/providers/upload-avatar-file` | Multer profile photo disk upload |
| GET | `/api/bookings/provider/mine` | Get provider bookings & job queue |
| PATCH | `/api/bookings/:id/accept` | Accept booking |
| PATCH | `/api/bookings/:id/reject` | Reject booking |
| PATCH | `/api/bookings/:id/complete` | Complete booking with OTP |
| GET | `/api/welfare/:providerId` | Get dynamic welfare score & metrics |
| GET | `/api/welfare/schemes` | List active society welfare schemes |
| POST | `/api/welfare/claims` | Apply for scheme grant |
| GET | `/api/welfare/claims` | List provider claims & disbursals |
| POST | `/api/providers/request-payout` | Request instant UPI / Bank payout |
| GET | `/api/providers/payouts/mine` | View payout history and receipts |
