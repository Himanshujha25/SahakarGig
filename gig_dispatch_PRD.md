# 📄 Product Requirement Document (PRD): AI Geospatial Broadcast & First-Acceptance Gig Dispatch Engine

**Platform**: SahakarGig (Cooperative Gig Services Platform)  
**Problem Statement**: SIH 2026 / Ministry of Cooperation PS 26089  
**Version**: 2.0 (Production Architecture Specification)  
**Status**: APPROVED FOR IMPLEMENTATION  

---

## 1. Executive Summary & Problem Statement

### 1.1 Current Limitation
In the standard manual provider picker model, households must browse individual worker profiles, pick a specific worker, and send a direct request. This model introduces friction:
- High latency if the selected worker is busy or unavailable.
- Upfront payment confusion for unconfirmed bookings.
- Inefficient worker utilization in dense urban localities (e.g. `Delhi, Indiranagar`).

### 1.2 The Proposed Solution: Autonomous Broadcast & First-Acceptance Dispatch
Instead of picking one worker manually, the household submits a service request specified by **Category** (`Electrician`) and **Locality** (`Delhi, Indiranagar`). 

The system autonomously:
1. **Broadcasts** the job in real-time to all nearby verified gig workers possessing matching skill tags.
2. **Atomically Locks** the job to the **first worker who accepts** ("First-Come / First-Served" race condition lock).
3. **Unlocks Provider Disclosure**: Once accepted, the customer's UI automatically updates to reveal full verified details (Name, Photo, Phone, e-Shram UAN, PMSBY Insurance, Cooperative Society Name, Rating & Past Reviews, 2-Way Chat, and Real-time Geolocation Map).
4. **Triggers Secured Escrow Payment**: Razorpay payment checkout is requested **only after** a worker has accepted the job.

---

## 2. Detailed User Flow & Behavioral Specifications

### 2.1 Household User Flow
```
[Select Category & Location] ──> [Submit Request (₹0)] ──> [Radar Scanning Animation]
                                                                  │
                                                        Worker Accepts Job
                                                                  │
                                                                  ▼
[Pay via Razorpay Escrow] <── [Live Map & Socket Chat] <── [Full Provider Disclosure Card Unlocked]
```

1. **Request Submission**:
   - Customer enters service type (e.g. `Electrician`) and locality (e.g. `Delhi, Indiranagar`).
   - Clicks **"Broadcast Job Request"**.
2. **Pre-Acceptance State (Radar Search)**:
   - System creates a booking in `broadcasting` status.
   - Household UI displays an interactive **Radar Scanning Screen** (*"Searching nearby certified cooperative electricians in Indiranagar..."*).
   - No payment is charged yet (Amount due: ₹0).
3. **Instant Post-Acceptance Disclosure**:
   - As soon as a worker taps **"Accept Job"**, the household UI receives a WebSocket push event `booking:assigned`.
   - Radar screen transitions into the **Unlocked Provider Disclosure Card**:
     - 📸 **Profile Picture & Full Name**: `Nitin Prakash`
     - 📞 **Contact Phone**: `+91 98765 43210` (Click to Call)
     - 🆔 **e-Shram & UAN Verification**: `UAN 1098 7654 3210` (Verified)
     - 🏢 **Cooperative Membership**: `Indiranagar Primary Labour Cooperative Society`
     - 🛡️ **Insurance & Social Security**: `PMSBY ₹2,00,000 Cover Active`
     - ⭐ **Rating & Reviews**: `4.8★ (126 Jobs Completed)` + Past Customer Comments
     - 💬 **2-Way Socket Chat**: Instant messaging panel
     - 📍 **Live Geolocation Map**: Real-time GPS tracking stream
4. **Secured Escrow Payment**:
   - Customer clicks **"Pay ₹250 via Razorpay"** to lock funds into escrow.

---

### 2.2 Gig Worker User Flow
```
[Worker App Online] ──> [Receive Push Notification] ──> [View Job Card (Location, Rate, Distance)]
                                                                  │
                                                          Tap "Accept Job"
                                                                  │
                                                ┌─────────────────┴─────────────────┐
                                                ▼                                   ▼
                                      [First to Accept: SUCCESS]         [Second to Accept: ALERT]
                                      "Job Locked & Assigned"           "Job claimed by another provider"
```

1. **Broadcast Alert Feed**:
   - Active verified providers with matching category (`Electrician`) receive an urgent audio/visual notification.
   - Job Card shows: Service (`Electrician`), Location (`Indiranagar, 1.2 km away`), Hourly Rate (`₹250/hr`), Emergency status.
2. **Atomic Race Lock**:
   - Provider taps **"Accept Job"**.
   - If Provider is first: Database atomically sets `providerId` and updates status to `accepted`.
   - If another provider accepted 50ms earlier: Server returns HTTP 409 Conflict and UI displays: *"Job already claimed by another provider."*

---

## 3. Technical & System Architecture Specifications

### 3.1 Data Model Schema Additions (`Booking.js`)

```javascript
const bookingSchema = new mongoose.Schema({
  householdId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null }, // Null until accepted
  cooperativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cooperative' },
  
  // Broadcast & Dispatch Fields
  dispatchMode: { type: String, enum: ['direct', 'broadcast'], default: 'broadcast' },
  broadcastStatus: { type: String, enum: ['broadcasting', 'assigned', 'expired', 'cancelled'], default: 'broadcasting' },
  targetCategory: { type: String, required: true }, // e.g. 'Electrician'
  locationText: { type: String, required: true },   // e.g. 'Delhi, Indiranagar'
  coordinates: {
    lat: { type: Number, default: 28.6139 },
    lng: { type: Number, default: 77.2090 }
  },
  
  service: { type: String, required: true },
  scheduledTime: Date,
  isEmergency: { type: Boolean, default: false },
  price: { type: Number, default: 250 },
  status: { type: String, enum: ['pending', 'accepted', 'in-progress', 'completed', 'cancelled'], default: 'pending' },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'released'], default: 'unpaid' },
  claimedAt: Date,
});
```

---

### 3.2 Atomic First-Acceptance Race Lock Precondition (`bookingController.js`)

To guarantee zero double-assignments during concurrent taps:

```javascript
async function acceptBroadcastRequest(req, res) {
  const { bookingId } = req.params;
  const provider = await Provider.findOne({ userId: req.user.userId });
  if (!provider) return res.status(403).json({ message: 'Only verified providers can accept jobs' });

  // Atomic Mongo Query enforcing status preconditions
  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      status: 'pending',
      broadcastStatus: 'broadcasting',
      providerId: null,
    },
    {
      $set: {
        providerId: provider._id,
        cooperativeId: provider.cooperativeId,
        status: 'accepted',
        broadcastStatus: 'assigned',
        claimedAt: new Date(),
      },
    },
    { new: true }
  ).populate('householdId', 'name phone').populate({ path: 'providerId', populate: { path: 'userId', select: 'name phone' } });

  if (!updatedBooking) {
    return res.status(409).json({ message: 'Job has already been claimed by another provider.' });
  }

  // Real-time WebSocket Dispatch
  emitTo(updatedBooking.householdId._id.toString(), 'booking:assigned', updatedBooking);
  io.emit('booking:claimed', { bookingId }); // Notify all other workers to remove card

  res.json(updatedBooking);
}
```

---

### 3.3 WebSocket Event Choreography

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `booking:broadcast_new` | Server → All Nearby Workers | `{ bookingId, service, locationText, price }` | Triggers alert sound & card on worker feed. |
| `booking:assigned` | Server → Household | `{ booking, providerDetails }` | Unlocks provider disclosure card & map on customer UI. |
| `booking:claimed` | Server → All Workers | `{ bookingId }` | Removes claimed job card from worker feeds. |
| `provider:location_update` | Worker → Server → Household | `{ lat, lng, bookingId }` | Live GPS location stream on map. |

---

## 4. Unlocked Provider Profile Disclosure Matrix

| Field | Pre-Acceptance (Searching) | Post-Acceptance (Assigned) |
| :--- | :--- | :--- |
| **Worker Identity** | Hidden (*"Searching nearby workers..."*) | **Unlocked**: Full Name + Profile Photo |
| **Contact Info** | Hidden | **Unlocked**: Direct Call Phone Number (`+91 98...`) |
| **e-Shram / UAN** | Hidden | **Unlocked**: Official UAN Badge & PMSBY Verification |
| **Cooperative** | Hidden | **Unlocked**: Registered Primary Cooperative Name |
| **Rating & Reviews** | Hidden | **Unlocked**: Star Rating + Past Customer Feedback |
| **Live GPS Map** | Hidden | **Unlocked**: Real-time Socket Position Stream |
| **2-Way Chat** | Hidden | **Unlocked**: Instant Socket Chat Room |
| **Razorpay Payment** | Disabled (₹0) | **Enabled**: Pay ₹250 Escrow Buttons |

---

## 5. Summary of Delivery Artifacts & Verification Steps

1. **`gig_dispatch_PRD.md`**: Official Requirements & Architecture Blueprint (This Document).
2. **`implementation_plan.md`**: Step-by-step engineering execution plan.
3. **Build & Test Verification**:
   - Execute `npm run build` cleanly.
   - Run multi-browser concurrent simulation (`nitin268@gmail.com` household vs `nitin@gmail.com` and `naklwudfnulwe@gmail.com` providers).

---

# ✅ Implementation Log — What Was Built & How It Works (v2.0.1)

> This section documents the **actual code implementation** of this PRD against the
> existing SahakarGig MERN application. Everything in Sections 1–5 above is the approved
> specification; this log records exactly which files were changed/added to fulfil it,
> and how each feature behaves at runtime **on real data**.

## 1. Summary of Delivered Implementation

| PRD Requirement (§) | Status | Where Implemented |
|---|---|---|
| §3.1 Broadcast/dispatch fields on `Booking` | ✅ DONE | `server/src/models/Booking.js` |
| §3.2 Atomic first-acceptance race lock | ✅ DONE | `server/src/controllers/bookingController.js` — `acceptBroadcastRequest` |
| Category + Locality broadcast (₹0 upfront) | ✅ DONE | `bookingController.js` — `createBroadcastBooking` |
| Provider live broadcast feed | ✅ DONE | `bookingController.js` — `availableBroadcastBookings` + `client/src/pages/Provider/DispatchFeed.jsx` |
| §3.3 WebSocket choreography (`booking:broadcast_new`, `booking:assigned`, `booking:claimed`, `provider:location_update`) | ✅ DONE | `server/src/socket/index.js` + `server/src/controllers/bookingController.js` |
| §2.1 Household radar → disclosure → escrow | ✅ DONE | `client/src/pages/Household/Dispatch.jsx` |
| §2.2 Worker accept + HTTP 409 second-tap alert | ✅ DONE | `bookingController.js` + `DispatchFeed.jsx` |
| Disclosure matrix: e-Shram, UAN, PMSBY, coop, rating, reviews, phone, chat/map link | ✅ DONE | `acceptBroadcastRequest` payload + `Dispatch.jsx` |
| Razorpay escrow gated **after** acceptance | ✅ DONE | `Dispatch.jsx` (pay button only on disclosure) + existing `paymentController.js` |

---

## 2. Files Changed / Added (with full paths)

### Backend (`server/`)

1. **`server/src/models/Booking.js`**
   - `providerId` & `cooperativeId` changed from `required` to **`default: null`** (a broadcast job has no provider until assigned).
   - Added PRD §3.1 fields:
     ```js
     dispatchMode:    { type: String, enum: ['direct','broadcast'], default: 'broadcast' },
     broadcastStatus: { type: String, enum: ['broadcasting','assigned','expired','cancelled'], default: 'broadcasting' },
     targetCategory:  { type: String },   // e.g. 'Electrician'
     locationText:    { type: String },   // e.g. 'Delhi, Indiranagar'
     coordinates:     { lat: Number (28.6139), lng: Number (77.2090) },
     claimedAt:       { type: Date },
     ```

2. **`server/src/controllers/bookingController.js`**
   - New imports: `Welfare`, `Review`, `broadcastAll`, `haversine`.
   - `createBroadcastBooking(req, res)` — household POSTs **only** `category`, `locality`, `lat/lng`, `price` (₹0 charged to the household). Creates a `broadcast` booking with `broadcastStatus:'broadcasting'`, then queries **verified** providers whose `skills[]` contain the matching category and whose `geoLocation` is inside the broadcast radius (Haversine). For each match it emits the `booking:broadcast_new` socket event with `{ bookingId, service, targetCategory, locationText, coordinates, price, isEmergency }`.
   - `availableBroadcastBookings(req, res)` — provider feed. Returns every `broadcast` + `broadcasting` + `providerId:null` booking that matches the provider's skills and is in range (uses provider's saved `geoLocation`, or a client-supplied `lat/lng`).
   - `acceptBroadcastRequest(req, res)` — the **atomic race lock** (PRD §3.2). Uses `Booking.findOneAndUpdate` with the precondition filter `{ _id, dispatchMode:'broadcast', broadcastStatus:'broadcasting', providerId:null, status:'requested' }` and atomically `$set`s `providerId`, `cooperativeId`, `status:'accepted'`, `broadcastStatus:'assigned'`, `claimedAt`. If the update matches **zero** documents (someone else claimed it first — even 50 ms earlier) it returns **HTTP 409 `Job has already been claimed by another provider.`** This guarantees **zero double-assignments** under concurrent taps.
   - Inside the atomic accept it **unlocks the disclosure** for the household: resolves the provider's `Welfare` (e-Shram, insurance), coerces ratings/jobs-completed from `Review`s and completed `Booking`s, then emits (PRD §3.3):
     - `booking:assigned` → household room: `{ booking, providerDetails }` (name, phone, cooperative, e-Shram, PMSBY, rating, jobs, reviews) — this is what flips the customer's radar into the full disclosure card.
     - `booking:claimed` → **all** connected clients: `{ bookingId }` — every other worker's feed removes the card.
   - `getBooking` now populates `providerId.userId.phone` and `cooperativeId.name` for disclosure rendering.

3. **`server/src/routes/bookings.js`** — three new guarded routes:
   ```js
   router.post('/broadcast',                auth, rbac('Household'), c.createBroadcastBooking);
   router.get('/broadcast/available',       auth, rbac('Provider'),  c.availableBroadcastBookings);
   router.patch('/:id/broadcast-accept',    auth, rbac('Provider'),  c.acceptBroadcastRequest);
   ```

4. **`server/src/socket/index.js`**
   - Added `broadcastAll(event, data)` — sends an event to **every** connected client (used for `booking:claimed`).
   - Added a `provider:location_update` socket handler (PRD §3.3): when a worker emits `{ bookingId, lat, lng }` the server looks up the booking and **forwards the live GPS to the household's room** as `provider:location_update`.

5. **`server/src/controllers/paymentController.js`** — fixed a pre-existing bug (audit C4): the provider "You received ₹X" notification now resolves `Provider._id → User._id` before calling `notify()`, so the provider truly receives the payout notification (relevant after a dispatch booking is paid).

### Frontend (`client/`)

6. **`client/src/pages/Household/Dispatch.jsx`** (NEW) — the household's 3-state page:
   - **Form state** — category dropdown (Plumber, Electrician, Tutor, Cook, Cleaner, Caregiver, Driver, Gardener, Carpenter, Painter), locality/address, offered ₹/hr, emergency toggle, and browser geolocation (falls back to Delhi coords). Button: **“Broadcast Job Request (₹0)”**.
   - **Radar state** — animated radar sweep + ping blips, “Searching nearby certified {category}…”, “Broadcasting to N nearby verified workers”, **“No payment charged yet — Amount due ₹0”**. It waits on the live `booking:assigned` socket event.
   - **Disclosure state** — unlocks **only after** a worker accepts: profile letter-avatar, verified badge, name, **click-to-call phone**, cooperative name, e-Shram/UAN, **PMSBY insurance**, skills, **star rating + jobs completed**, recent customer reviews, plus a **“Pay ₹X via Razorpay” escrow button** (the payment gate appears only now, per §2.1 step 4) and a “Track live status & chat” link.
   - Supports deep-link reload via `/household/dispatch/:id` (re-fetches the booking and rebuilds the disclosure).

7. **`client/src/pages/Provider/DispatchFeed.jsx`** (NEW) — the worker's live broadcast feed:
   - Cards show category, household name, locality/address, timestamp, **₹/hr**, and an emergency badge.
   - **“Accept Job”** calls `PATCH /bookings/:id/broadcast-accept`. On success the job is removed from the feed and the worker is taken to `JobDetail`. On **HTTP 409** it shows the alert **“Job already claimed by another provider”** and removes the card (PRD §2.2 second-acceptor branch).
   - Subscribes to `booking:broadcast_new` (new card appears instantly) and `booking:claimed` (card vanishes), **plus a 15-second polling fallback** so real accounts without a saved geo-location or a momentary socket gap still see live jobs.

8. **`client/src/App.jsx`** — added routes:
   - Household: `/household/dispatch` and `/household/dispatch/:id` → `Dispatch`.
   - Provider: `/provider/dispatch` → `DispatchFeed`.

9. **`client/src/layouts/HouseholdLayout.jsx`** & **`client/src/layouts/ProviderLayout.jsx`** — added a **Dispatch** nav item (Radar icon for household, Radio icon for provider) that follows the same active/inactive styling as the rest of the dashboard.

10. **`client/src/pages/Household/Home.jsx`** — added a prominent **Dispatch CTA banner** so households can discover the broadcast flow directly from the home dashboard.

11. **`client/src/index.css`** — added `@keyframes sg-radar-sweep` and `sg-radar-ping` plus helper classes for the radar animation, using the app's existing primary blue (`#00288e`) and green (`#006d30`) tokens so it matches the design system.

All new/changed pages use the app's existing design tokens (primary `#00288e`, surface tokens, Hanken Grotesk / Source Sans 3, the `bg-[#e8edff] text-[#00288e]` accent, card/button patterns) so they are fully **synchronised with the dashboard theme**.

---

## 3. How the End-to-End Flow Works on Real Data

```
 Household (Dispatch.jsx)                 Server (Express + Mongo)                 Provider (DispatchFeed.jsx)
─────────────────────────────           ──────────────────────────────           ──────────────────────────────
 1. Pick category + locality,            POST /bookings/broadcast                  (listening)
    click "Broadcast (₹0)"  ──────────►  create booking broadcast/broadcasting     ◄── 2. socket 'booking:broadcast_new'
                                         find verified providers w/ skill tag          card appears "Open"
                                         + within radius (Haversine)                    with location, ₹/hr, emergency
                                                                                        │
                                                                        (two workers tap Accept ~same time)
                                                                              │ worker A                 │ worker B
                                                                              ▼                          ▼
                                                                      PATCH /:id/broadcast-accept   PATCH /:id/broadcast-accept
                                                                      findOneAndUpdate MATCHES        findOneAndUpdate matches 0
                                                                      → atomic $set providerId        → HTTP 409
 3. socket 'booking:assigned' ◄────────────────────────── emit booking:assigned {booking, providerDetails}          │
    radar → DISCLOSURE card                              emit booking:claimed → ALL workers remove card   ◄────────┘
    (name, phone, e-Shram, PMSBY,                                                                         (worker B sees
     coop, rating, reviews)                                                                          "already claimed")
    + live GPS stream (provider:location_update) ──────────────────────────────────────── worker emits GPS at intervals
 4. "Pay ₹X via Razorpay" ◄── escrow button only enabled now ──────────────────────────────
    → POST /payments/create-order → Razorpay checkout → verify → Payment+Invoice released
```

**Key invariants guaranteed on real data:**
- A broadcast booking has **no** `providerId` until a worker accepts (schema nullable).
- The atomic `findOneAndUpdate` preconditions mean **at most one** worker can ever win — every other concurrent tap gets a deterministic 409, never a double assignment.
- No money is charged at broadcast time (₹0); the Razorpay escrow button is rendered **only after** the disclosure is unlocked.
- Provider identity (name/phone/welfare/insurance/reviews) is **hidden during radar** and **revealed only after acceptance**, exactly per the §4 disclosure matrix.
- Live GPS, instant card removal, and instant disclosure all ride on the Socket.io event choreography, with polling as a real-world safety net.

---

## 4. Verification Performed

- **Backend syntax:** all touched files pass `node --check` (models, controllers, routes, socket).
- **Frontend build:** `npm run build` completes cleanly — **1977 modules transformed**, no errors (only the standard Vite >500 kB chunk-size advisory, which is non-blocking).
- **Live test:** a seeded end-to-end DB test could not be executed in this environment because MongoDB is not installed/running here. Recommended verification on your machine:
  ```bash
  cd server && npm run seed && npm run dev   # API :5000
  cd client && npm run dev                    # UI  :5173
  ```
  Then log in in **two browsers** — household `nitin268@gmail.com` and worker
  `nitin@gmail.com` — open Household → **Dispatch**, broadcast an `Electrician`
  job, and accept it from the worker's **Dispatch** feed to watch radar → disclosure
  → escrow in real time. (Workers `nitin@gmail.com` / `naklwudfnulwe@gmail.com`,
  password `123456789`.)

