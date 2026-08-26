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
| **Razorpay Payment** | Disabled (₹0) | **Enabled**: Pay ₹250 Escrow Button |

---

## 5. Summary of Delivery Artifacts & Verification Steps

1. **`gig_dispatch_PRD.md`**: Official Requirements & Architecture Blueprint (This Document).
2. **`implementation_plan.md`**: Step-by-step engineering execution plan.
3. **Build & Test Verification**:
   - Execute `npm run build` cleanly.
   - Run multi-browser concurrent simulation (`nitin268@gmail.com` household vs `nitin@gmail.com` and `naklwudfnulwe@gmail.com` providers).
