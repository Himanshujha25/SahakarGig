# SahakarGig — Common Features & Shared Modules

> Documentation for cross-cutting concerns, shared utilities, and common infrastructure used across all four portals (Household, Provider, Federation, Admin).

---

## 📁 Folder Structure

```
docs/features/
├── common/              ← You are here — shared/cross-cutting docs
│   ├── OVERVIEW.md
│   ├── AUTH.md
│   ├── NOTIFICATIONS.md
│   ├── AI_CHATBOT.md
│   └── THEME_SYSTEM.md
├── provider/            ← Service Provider portal docs
├── federation/          ← Cooperative Federation portal docs
├── cooperative/         ← Individual Cooperative portal docs
└── household/           ← Household (Customer) portal docs
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + React Router v6 |
| Styling | Custom CSS (index.css) + CSS variables |
| State | React Context API (AuthContext, ThemeContext) |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (access tokens stored in localStorage) |
| Real-time | Socket.io |
| Payments | Razorpay (test mode) |
| Email | Nodemailer |
| AI | Google Gemini API |
| File Uploads | Multer + Cloudinary |

---

## 🔑 User Roles

| Role | Description | Portal |
|------|-------------|--------|
| `household` | Customer — books services | `/household/*` |
| `provider` | Gig worker — accepts jobs | `/provider/*` |
| `cooperative` | Cooperative admin | `/federation/*` |
| `admin` | Platform super-admin | `/admin/*` |

---

## ✅ Implemented — Common / Shared

- [x] **JWT Authentication** — login, signup, OTP verification, role-based routing
- [x] **Role-based Route Protection** — `RoleRoute.jsx` guards each portal
- [x] **Theme System** — `ThemeContext.jsx` with light/dark/system modes + CSS variables
- [x] **AI Chatbot** — `AIChatbot.jsx` with Gemini API, role-aware context
- [x] **Notification Bell** — `NotificationBell.jsx` with real-time socket updates
- [x] **PWA Install Banner** — `PwaInstallBanner.jsx`
- [x] **Language Toggle** — `LangToggle.jsx` (English/Hindi UI toggle)
- [x] **OTP Flow** — `OtpModal.jsx` + `OtpInput.jsx` for phone verification
- [x] **Email Notifications** — Nodemailer via `server/src/utils/email.js`
- [x] **Appearance Settings** — `AppearanceSettings.jsx` (theme picker component)
- [x] **Toast Notifications** — `NotificationToasts.jsx`
- [x] **Trust Score Badge** — `TrustSystemBadge.jsx` (computed on-the-fly, not stored)
- [x] **Welfare Badge** — `WelfareBadge.jsx`
- [x] **Verified Badge** — `VerifiedBadge.jsx`
- [x] **Trust Ring** — `TrustRing.jsx` visual ring indicator
- [x] **Page Header** — `PageHeader.jsx` reusable header component
- [x] **Bottom Nav** — `BottomNav.jsx` mobile navigation bar
- [x] **AI Voice Search** — `AIVoiceSearchModal.jsx`
- [x] **Coop Marquee Ticker** — `CoopMarqueeTicker.jsx`
- [x] **Worker Welfare Dashboard** — `WorkerWelfareDashboard.jsx` component
- [x] **Fair Wage Breakdown** — `FairWageBreakdown.jsx` component

---

## ❌ Not Yet Implemented — Common / Shared

- [ ] **Refresh Token** — No token refresh; JWT expires → user logged out
- [ ] **Rate Limiting** — No rate limiting on auth/API endpoints (brute-force risk)
- [ ] **CSRF Protection** — JWT in localStorage (XSS risk); no CSRF tokens
- [ ] **Full i18n** — LangToggle exists but react-i18next translation strings not wired
- [ ] **Geo-location Matching** — Haversine provider proximity not implemented
- [ ] **Push Notifications** — PWA manifest ready but push not wired
- [ ] **Socket Auth Guard** — Socket.io connections are not JWT-authenticated
- [ ] **React Error Boundaries** — No error boundary wrapping any portal
- [ ] **Global Skeleton/Loading** — No Suspense or skeleton screens on route transitions
- [ ] **Audit Logging** — No server-side audit trail for sensitive actions
- [ ] **Unit / Integration Tests** — Zero test coverage (frontend + backend)
- [ ] **QR Code Provider ID Card** — Mentioned in PRD, not built yet

---

## 📂 Key Shared Files

| File | Purpose |
|------|---------|
| `client/src/context/ThemeContext.jsx` | Global theme provider (light/dark/system) |
| `client/src/components/AIChatbot.jsx` | AI assistant powered by Gemini API |
| `client/src/components/NotificationBell.jsx` | Real-time notification bell via socket |
| `client/src/components/RoleRoute.jsx` | Auth + role guard wrapper |
| `client/src/components/AccountSecurity.jsx` | Password change / account security tab |
| `client/src/components/AppearanceSettings.jsx` | Theme picker UI component |
| `server/src/utils/email.js` | Nodemailer email utility |
| `server/src/middleware/` | Auth middleware, role guards |
| `client/src/index.css` | Global design system & CSS variables |
| `server/src/models/Notification.js` | Notification schema |
| `server/src/routes/notifications.js` | Notification API endpoints |
