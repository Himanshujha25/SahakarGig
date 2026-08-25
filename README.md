# SahakarGig — Cooperative Gig Services Platform

SIH 2026 · Problem Statement **26089** — Cooperative Gig Services Platform for
Household & Community Services. A MERN stack, cooperative-owned marketplace that
connects households with verified local service providers governed by registered
cooperative societies.

## Stack
- **Frontend:** React (Vite) + Tailwind CSS (design tokens from Stitch) + React Router + Axios + Socket.io-client + i18next
- **Backend:** Node.js + Express + MongoDB (Mongoose) + Socket.io
- **Auth:** JWT + role-based access control (Household / Provider / Cooperative Admin)
- **Payments:** Razorpay-ready (mock capture for demo)
- **Design:** full design system in `client/src/index.css` (colors, typography, components)

## Prerequisites
- Node.js 18+
- **MongoDB** running locally on `mongodb://127.0.0.1:27017` (or set `MONGODB_URI` in `server/.env`)

Quick MongoDB options:
```bash
# Docker
docker run -d -p 27017:27017 --name sg-mongo mongo:7

# or install MongoDB Community locally and run: mongod
```

## Backend setup
```bash
cd server
npm install
cp .env.example .env        # optional; sensible defaults are built in
npm run seed               # creates 3 cooperatives, 15 providers, 10 households
npm run dev                # API on http://localhost:5000
```

### Demo accounts (created by seed)
| Role | Email | Password |
|------|-------|----------|
| Cooperative Admin | `admin1@coop.com` | `password123` |
| Household | `house1@mail.com` | `password123` |
| Provider | `prov1@mail.com` | `password123` |

## Frontend setup
```bash
cd client
npm install
npm run dev                # app on http://localhost:5173
```
> The frontend expects the API at `http://localhost:5000`. Override with
> `VITE_API_URL` / `VITE_SOCKET_URL` if needed.

## Flow (demo order)
1. **Sign up / log in** as one of the 3 roles.
2. **Household** searches verified providers → books (optionally Emergency) →
   live status via Socket.io → completes → pays (mock Razorpay) → invoice → review.
3. **Provider** sees the job in the queue → accepts → updates status → earns payout.
4. **Cooperative Admin** verifies providers, resolves disputes, tunes commission,
   views revenue + leaderboard on the dashboard.

## Project structure
```
client/   React app (src/pages/{auth,Household,Provider,Admin}, src/components, src/lib, src/context)
server/   Express API (src/models, src/controllers, src/routes, src/middleware, src/utils, src/socket) + seed.js
docs/     HLD, PRD, BILLING, INTERNAL_FUNCTIONAL
```

## API (high level)
- `POST /api/auth/signup` · `POST /api/auth/login` · `GET /api/auth/me`
- `GET /api/providers` (geo filter) · `GET /api/providers/:id` · `GET /api/providers/me`
- `POST /api/bookings` · `GET /api/bookings/household|provider/mine` · accept/status/cancel/dispute/chat
- `POST /api/reviews` · `GET /api/reviews/provider/:id`
- `POST /api/payments/capture` · `GET /api/payments/invoice/:bookingId`
- `GET /api/admin/dashboard|leaderboard|verifications|disputes|commission|providers`
- `GET/PUT /api/welfare/:providerId` · `GET /api/notifications`
