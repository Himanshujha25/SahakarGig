# SIH 2026 — Prototype Prompts, PPT Content, Video Scripts & HLD

### PS26089 (Cooperative Gig Services Platform) + PS26043 (Societal Challenge Crowdsourcing Platform)

---

# 🟦 PART A — SIH26089: Cooperative Gig Services Platform

**Ministry:** Ministry of Cooperation
**Theme:** Smart Automation

---

## A1. Prototype Build Prompt (paste into Claude Code / Cursor / any AI coding assistant)

```
Build a MERN stack web application called "SahakarGig" — a Cooperative Gig Services
Platform that connects households/communities with verified local service providers
(plumbers, electricians, tutors, cooks, cleaners, caregivers) operating through
registered cooperative societies.

TECH STACK:
- Frontend: React (Vite) + Tailwind CSS + React Router + Axios
- Backend: Node.js + Express.js
- Database: MongoDB (Mongoose)
- Auth: JWT-based, role-based access control (Household, Provider, Cooperative Admin)
- Real-time: Socket.io for live booking status updates
- Payments: Razorpay test mode (mock checkout is acceptable for hackathon demo)
- File uploads: Multer + Cloudinary/local storage for provider ID/verification docs

USER ROLES:
1. Household (customer) — browse services, book, chat, pay, rate
2. Service Provider (gig worker) — register under a cooperative, list skills/availability,
   accept/reject bookings, view earnings
3. Cooperative Admin — verify providers, monitor disputes, view analytics dashboard,
   manage commission/payout rules

CORE DATA MODELS:
- User { name, phone, email, role, passwordHash, address, geoLocation }
- Cooperative { name, registrationId, region, adminId, memberProviderIds[] }
- Provider { userId, cooperativeId, skills[], hourlyRate, verified (bool),
  trustScore, availabilitySlots[], documents[] }
- Booking { householdId, providerId, service, scheduledTime, status
  (requested/accepted/in-progress/completed/cancelled/disputed), price, paymentStatus }
- Review { bookingId, rating (1-5), comment, createdBy }
- Payment { bookingId, amount, cooperativeCommission, providerPayout, status }

KEY FEATURES TO BUILD:
1. Auth: signup/login for all 3 roles with JWT + role-based route protection
2. Service discovery: search/filter by category, location radius, price, rating
3. Booking flow: request → provider accept/reject → live status via Socket.io →
   completion → payment release → rating prompt
4. Trust Score engine: simple weighted formula = (avg rating * 0.5) +
   (completion rate * 0.3) + (cooperative verification * 0.2) — display as a badge
5. Cooperative Admin Dashboard: pending verifications, active disputes, total
   bookings/revenue chart (use Recharts), provider leaderboard
6. Notification system: in-app toast + email (Nodemailer) on booking status change
7. Multilingual toggle (English/Hindi minimum) using react-i18next
8. Dispute resolution flow: household or provider can flag a booking → goes to
   Cooperative Admin queue with chat log attached

NICE-TO-HAVE (if time permits):
- Geo-fenced provider matching (show only providers within X km using Haversine formula)
- QR-code based provider ID verification card (generate with `qrcode` npm package)
- Simple ML/rule-based dynamic pricing suggestion based on demand density

DELIVERABLE STRUCTURE:
/client (React app)
/server (Express API, organized as routes/controllers/models/middleware)
/server/seed.js — seed script with 3 cooperatives, 15 providers, 10 households, sample bookings
README.md with setup instructions and .env.example

Build this as a working, demoable prototype prioritizing: auth → booking flow →
admin dashboard → trust score badge → notifications, in that order.
```

---

## A2. PPT Slide Content (7 slides — SIH standard format)

**Slide 1 — Title**
- SahakarGig — AI-Assisted Cooperative Gig Services Platform
- PS Code: SIH26089 | Theme: Smart Automation | Ministry of Cooperation
- Team Name + Members

**Slide 2 — Problem Statement**
- Households struggle to find *trustworthy, verified* local service providers for
  everyday needs (repairs, tutoring, care, cleaning)
- Independent gig workers lack collective bargaining power, fair pricing, and
  formal income proof
- No structured digital platform currently links India's cooperative societies to
  the household gig-services economy

**Slide 3 — Proposed Solution**
- A cooperative-backed gig marketplace where every provider is verified and
  monitored by a registered cooperative society (accountability layer Urban
  Company doesn't have)
- Real-time booking, live tracking, in-app chat, secure payments, and a
  transparent Trust Score for every provider
- Cooperative gets a dashboard to manage members, resolve disputes, and track
  community income generated

**Slide 4 — High-Level Architecture (HLD)**
- Diagram: Client (React) ⇄ REST API (Express) ⇄ MongoDB
- Socket.io layer for real-time booking status
- Payment Gateway (Razorpay) integration
- Notification service (Email/SMS) triggered on state changes
- Cooperative Admin layer sits above Provider layer for verification & governance

**Slide 5 — Key Features**
- Verified provider onboarding via cooperative
- Live booking + trust score badge
- Dispute resolution workflow
- Admin analytics dashboard (revenue, active workers, ratings)
- Multilingual (Hindi/English) support

**Slide 6 — Feasibility & Impact**
- Feasibility: Built entirely on open-source MERN stack, low infra cost, scalable
  to any cooperative society in India
- Impact: Formalizes gig income for cooperative members, builds consumer trust,
  supports Ministry of Cooperation's "Sahakar se Samriddhi" vision
- Revenue model: small commission per booking retained by cooperative (member benefit)

**Slide 7 — Tech Stack & Team**
- MongoDB, Express.js, React.js, Node.js, Socket.io, Razorpay, JWT, Tailwind CSS
- Team roles: Frontend / Backend / Database / UI-UX / Presentation

---

## A3. Video Script (≈100 seconds narration)

> "Every day, millions of Indian households need a trustworthy plumber, tutor, or
> caregiver — but existing gig platforms are urban-centric, unaccountable, and
> leave workers without collective support.
>
> We built **SahakarGig** — a cooperative-backed gig services platform that
> connects households directly with service providers verified and governed by
> their local cooperative society.
>
> Here's how it works: a household searches for a service, sees verified
> providers ranked by a transparent **Trust Score**, and books instantly. The
> provider accepts, and both sides get live status updates in real time. Once the
> job is done, payment is released automatically and the household leaves a
> rating.
>
> Behind the scenes, the Cooperative Admin Dashboard gives society leaders full
> visibility — pending verifications, active disputes, and community earnings —
> all in one place.
>
> Built on the MERN stack with Socket.io for real-time updates and Razorpay for
> payments, SahakarGig is lightweight, scalable, and ready to deploy across any
> of India's thousands of cooperative societies — turning informal gig work into
> a formal, trusted, and dignified livelihood."

---

## A4. HLD Explanation (Plain-English Walkthrough)

Think of it in **4 layers**:

1. **Client Layer (React app)** — What the user sees. Three different views render
   based on role: Household sees a marketplace; Provider sees a job queue;
   Cooperative Admin sees a dashboard. All talk to the backend via REST API calls.

2. **API Layer (Node.js + Express)** — The "brain." It exposes endpoints like
   `/api/bookings`, `/api/providers`, `/api/auth`. Every request carries a JWT
   token so the server knows who's asking and what they're allowed to do
   (role-based access control).

3. **Real-Time Layer (Socket.io)** — The moment a provider accepts a booking, the
   server pushes an event down a socket connection so the household's screen
   updates *instantly* — no page refresh, no polling.

4. **Data Layer (MongoDB)** — Stores everything: users, cooperatives, bookings,
   reviews, payments. Mongoose schemas keep the structure consistent (e.g., every
   Booking always has a status field moving through a defined lifecycle:
   requested → accepted → in-progress → completed).

**The one "smart" piece:** the Trust Score isn't stored — it's *calculated on the
fly* from rating history, completion rate, and cooperative verification status.
This is what you'll want to demo live: show a provider's score changing after a
new review comes in.

---
---