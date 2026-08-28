# Provider Portal — Feature Documentation

> All features for the Service Provider (Gig Worker) portal at `/provider/*`

---

## Pages

| Page | File | Route |
|------|------|-------|
| Job Queue | `Provider/JobQueue.jsx` | `/provider/jobs` |
| Job Detail | `Provider/JobDetail.jsx` | `/provider/jobs/:id` |
| Dispatch Feed | `Provider/DispatchFeed.jsx` | `/provider/dispatch` |
| Earnings | `Provider/Earnings.jsx` | `/provider/earnings` |
| Profile | `Provider/Profile.jsx` | `/provider/profile` |
| Welfare | `Provider/Welfare.jsx` | `/provider/welfare` |
| Announcements | `Provider/Announcements.jsx` | `/provider/announcements` |

---

## ✅ Implemented Features

### Job Management
- [x] **Job Queue** — List of incoming/active/past bookings with status filters
- [x] **Accept / Reject Jobs** — Provider can accept or reject a booking request
- [x] **Job Detail Page** — Full booking details, customer info, service specs
- [x] **Job Status Updates** — Mark job as in-progress, completed
- [x] **Dispatch Feed** — Real-time live feed of nearby/available dispatch jobs
- [x] **Job History** — Completed and cancelled job history

### Earnings
- [x] **Earnings Dashboard** — Total earnings, pending payouts, completed payouts
- [x] **Payout History** — List of past payouts with amounts and dates
- [x] **Earnings Breakdown** — Per-booking earnings with commission deducted
- [x] **Payout Model** — `server/src/models/Payout.js` created

### Profile
- [x] **Profile Management** — Name, phone, skills, hourly rate, bio
- [x] **Photo Upload** — Profile picture upload (Multer/Cloudinary)
- [x] **Document Upload** — ID and verification documents
- [x] **Skills & Availability** — Multi-select skills, availability slots
- [x] **Cooperative Association** — Shows which cooperative the provider belongs to
- [x] **Trust Score Display** — Live trust score computed from ratings + completion rate
- [x] **Welfare Badge** — Shows welfare scheme enrollment status

### Welfare
- [x] **Welfare Dashboard** — View enrolled welfare schemes
- [x] **WorkerWelfareDashboard component** — Reusable welfare summary card
- [x] **Scheme Details** — Insurance, pension, health scheme display

### Announcements
- [x] **Announcements Page** — View announcements from cooperative / federation
- [x] **Read/Unread tracking** — Mark announcements as read

---

## ❌ Not Yet Implemented

### Job Management
- [ ] **Real-time Job Arrival** — Socket.io push when new job matches provider (currently polling)
- [ ] **Job Bid System** — Provider bidding on posted jobs (currently direct assignment)
- [ ] **Multi-booking Scheduling** — Calendar view for managing multiple jobs per day
- [ ] **Job Photos** — Provider uploads before/after photos of completed work
- [ ] **Job Cancellation Penalty** — Track and display cancellation rates affecting trust score

### Earnings
- [ ] **Bank Account Linking** — Provider adds bank account for payouts
- [ ] **Withdrawal Request** — Provider requests withdrawal to bank account
- [ ] **Tax Report / Invoice Download** — Monthly earnings statement PDF
- [ ] **UPI Payout Integration** — Actual Razorpay payout API (currently mock)
- [ ] **GST Deduction Display** — Show tax breakdown in earnings

### Profile
- [ ] **KYC Verification Status** — Aadhaar / PAN verification status per provider
- [ ] **QR Code ID Card** — Generate provider QR identity card (mentioned in PRD)
- [ ] **Background Check Status** — Police verification integration (placeholder)
- [ ] **Language Skills** — Languages spoken field

### Welfare
- [ ] **Welfare Scheme Enrollment** — Provider can enroll in a scheme from the UI
- [ ] **Scheme Claim Submission** — Provider files a claim within the app
- [ ] **Insurance Integration** — Actual insurance partner API

### Other
- [ ] **In-app Chat with Household** — Direct messaging during active booking
- [ ] **Review Response** — Provider can reply to household reviews
- [ ] **Training Modules** — Upskilling content for cooperative workers
- [ ] **Referral System** — Provider refers other workers to cooperative

---

## API Endpoints (Provider)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/providers/me` | Get own provider profile |
| PUT | `/api/providers/me` | Update profile |
| GET | `/api/providers/jobs` | Get job queue |
| PUT | `/api/bookings/:id/accept` | Accept a booking |
| PUT | `/api/bookings/:id/reject` | Reject a booking |
| PUT | `/api/bookings/:id/complete` | Mark booking complete |
| GET | `/api/providers/earnings` | Get earnings summary |
| GET | `/api/welfare/me` | Get welfare info |
| POST | `/api/providers/upload-doc` | Upload verification document |
