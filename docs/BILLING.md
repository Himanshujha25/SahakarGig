# SahakarGig — Billing, Commission & Invoicing

> How money moves across **Federation → Cooperative → Provider**, plus invoicing.
> Aligned to PS 26089 (digital payments & invoicing).

## 1. The Three-Way Split

The household pays the **full booking amount**. At payment release it splits into
three parts:

```
Household pays: amount
        │
        ├── federationCommission  → kept by the Federation (top-tier society body)
        ├── cooperativeCommission → kept by the Cooperative (local society)
        └── providerPayout        → paid to the Provider
```

**Admins do NOT charge providers separately.** Both commissions are cuts taken from
each successful booking. This funds the cooperative ecosystem while keeping worker
payout fair.

Rule enforced in code:

```
federationCommission + cooperativeCommission + providerPayout === amount
```

---

## 2. Commission Rules (Configurable)

| Parameter              | Set by            | Default |
|------------------------|-------------------|---------|
| `federationRate`       | Federation Admin  | 2%      |
| `cooperativeRate`      | Cooperative Admin | 8%      |
| Provider keeps         | (remainder)       | 90%     |

Example (10% total commission, amount ₹500):

| Item                     | Value   |
|--------------------------|---------|
| Booking amount           | ₹500    |
| Federation commission 2% | ₹10     |
| Cooperative commission 8%| ₹40     |
| Provider payout          | ₹450    |

Rates live on the `Federation` and `Cooperative` documents; changes affect **future**
bookings only.

---

## 3. Payment Lifecycle

```
1. requested        → pending (auth hold / no charge in test mode)
2. accepted         → confirmed
3. completed        → payment captured (Razorpay)
4. released         → split: federation + coop + provider recorded
5. disputed→resolved→ refunded / adjusted (commissions reversed too)
```

Provider is paid only after completion → protects households.

---

## 4. Invoicing (PS Requirement #5)

On payment release, an **Invoice** document is generated:

| Field             | Meaning                                         |
|-------------------|-------------------------------------------------|
| `invoiceNumber`   | Unique, e.g., `SG-<year>-<seq>`                 |
| `bookingId`       | Link to booking                                 |
| `paymentId`       | Link to payment                                 |
| `items[]`         | service, qty/hours, rate                        |
| `tax`             | optional GST/levy                               |
| `total`           | = Payment.amount                                |
| `generatedAt`     | timestamp                                       |

- Household can **download/view invoice** (PDF or in-app) — formal proof of service.
- Provider's welfare profile uses invoice totals as **income proof**.

---

## 5. Razorpay (Test Mode)

- Checkout modal (or mock for demo). Webhook/callback captures amount → creates
  `Payment` + `Invoice`, flips `Booking.paymentStatus = paid`.

---

## 6. Refunds & Disputes

- `disputed` → resolved in household's favor → `Payment.status = refunded`.
- Both federation and cooperative commissions reversed so the ecosystem doesn't
  earn on a failed booking.

---

## 7. Ledger Queries (Mongoose aggregate)

- Federation revenue: `sum(federationCommission)` where released.
- Cooperative revenue: `sum(cooperativeCommission)` where released.
- Provider earnings: `sum(providerPayout)` where released AND providerId = X.
- Invoices issued: count of Invoice where cooperativeId = Y.
