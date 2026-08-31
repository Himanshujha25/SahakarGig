# Form Field Extension — Account Creation Forms

> **Scope:** Detailed account-creation fields added to the **Household**, **Cooperative**, and
> **Federation** signup flows, why each is important, and how it maps to the backend data model.
>
> **Why this exists:** The original signup forms collected only a handful of fields (name, email,
> phone, password + one entity field). This meant accounts were created without the profile data the
> product actually uses — emergency contact, address, governance, and financial configuration — so
> users had to re-enter everything after login. These extensions capture the important details **at
> signup** so the account is immediately usable and dashboards light up with real data.

---

## 1. Household Signup

**Files:** `client/src/pages/auth/Signup.jsx` → `server/src/controllers/authController.js` (`signup`)
**Backend model:** `server/src/models/User.js`

### Field map

| Field (form) | Model field | Stored on `/me` | Required | Why it's important |
| --- | --- | --- | --- | --- |
| Preferred Language | `prefLang` | Yes | No | Multi-language UI (react-i18next). Lets us tailor the experience + notifications in the user's language from day one. |
| Household / Street Address | `address` | Yes | No | Powers geo-located provider discovery (Haversine radius filter). Without it, Find Services can't show nearby providers. |
| City | `location` | Yes | No | Combined into a human-readable location label shown on bookmarks, invoices, and search. |
| State | `location` | Yes | No | Used for regional filtering and jurisdiction in dispute resolution. |
| PIN Code | (validated) | — | No | 6-digit validation of serviceable area; forms the location key for geo-matching. |
| Household Size | `householdSize` | Yes | No | Used for **Group Booking** pricing (`totalPrice = hourlyRate × memberCount`) and right-sizing recommendations. |
| Emergency Contact Name | `emergencyContact.name` | Yes | No | Safety net — used for emergency/on-demand bookings and urgent provider dispatch alerts. |
| Emergency Contact Phone | `emergencyContact.phone` | Yes | No | Reachable next-of-kin for critical dispatch/emergency scenarios. |
| Special Instructions / About You | `specialInstructions`, `bio` | Yes | No | Travel/access notes and service preferences given to the dispatched provider. |

### Why these matter for the Household persona

- **Geo-matching (official PS 26089 feature #4):** household signup now feeds the geo filter and
  "nearest-first" provider sorting instead of relying on a manual location re-entry later.
- **Emergency bookings (feature #8):** emergency contact is captured up-front so emergency dispatch
  has someone to notify.
- **Group/recurring bookings:** household size directly feeds the group-booking pricing model.
- **Less friction:** the user fills profile details once, then everything (Profile tab, address book,
  ---

## 2. Cooperative Admin Signup

**Files:** `client/src/pages/auth/CoopSignup.jsx` & `client/src/pages/auth/Signup.jsx`
→ `server/src/controllers/authController.js` (`signup`)
**Backend model:** `server/src/models/Cooperative.js`

### Field map

| Field (form) | Model field | Why it's important |
| --- | --- | --- |
| Cooperative Legal Name | `name` | Required registration identity, shown across dashboards. |
| Registration ID (MSCS/State) | `registrationId` | Official society registration number for compliance audits. |
| Registration Type | (validated) | Distinguishes State / Multi-State / National cooperatives (affects the regulator + compliance rules). |
| Sector | `sector` | Services the society provides → drives the skill catalogue and category configuration. |
| Member Strength | `memberCount` | Feeds workforce KPIs (provider counts, verification ratios, leaderboard). |
| Year of Establishment | `foundedYear` | Governance history; shown on cooperative profile & audit reports. |
| State / District / City (Region) | `state`, `district`, `region` | Jurisdiction for federation grouping, geo heatmaps, and dispute resolution. |
| Registered Office Address | `address` | Legal correspondence address for society verification. |
| President Name | `presidentName` | Society statutory leadership, appears on the cooperative profile. |
| Secretary Name | `secretaryName` | Additional governance contact for audits and circulars. |
| Commission Rate (%) | `commissionRate` | Per-booking society commission — drives revenue model & payouts. |
| Welfare Fund Allocation (%) | `welfareFundAllocation` | % of commission set aside for worker social security/welfare (feature #7). |
| Payout Account Holder | `payoutBank.holderName` | Name on the settlement bank account. |
| Payout Bank Name | `payoutBank.bankName` | Required to route commission payouts (NEFT / Razorpay). |
| Payout Account Number | `payoutBank.accountNumber` | Destination for commission payouts. |
| IFSC Code | `payoutBank.ifsc` | Validated bank routing for payouts. |

### Why these matter for the Cooperative persona

- **Revenue & treasury:** commission + welfare allocation are captured at signup so the Financials
  dashboard, treasury, and member-payout flows work with real percentages instead of mock defaults.
- **Governance & compliance:** president/secretary + founded year + office address feed the audit,
  annual-return, and notice-governance features.
- **Federation onboarding:** state/district/region is used to **auto-link the cooperative to an
  existing federation** in the same region during signup.

---

## 3. Federation Admin Signup

**Files:** `client/src/pages/auth/FederationSignup.jsx`
→ `server/src/controllers/authController.js` (`signup`)
**Backend model:** `server/src/models/Federation.js`

### Field map

| Field (form) | Model field | Why it's important |
| --- | --- | --- |
| Federation Name | `name` | Registration identity, shown across the federation portal. |
| Registration ID | `registrationId` | Apex registration reference used in onboarding + reports. |
| Registration Type | (validated) | State / Multi-State / National / Apex — determines regulator & scope. |
| State | `state` | Jurisdiction for aggregating member cooperatives. |
| District | `district` | Geo grouping for heatmaps & analytics. |
| Region | `region` | Used to auto-link cooperatives in the same region. |
| Headquarters Address | `address` | Legal address of the apex body. |
| President / Chairperson | `presidentName` | Federation leadership shown in governance records. |
| Secretary Name | `secretaryName` | Additional governance contact. |
| Default Commission (%) | `commissionRate` | Platform-wide default commission for the federation (Billing.md revenue split). |
| Welfare Fund (%) | `welfareFundAllocation` | Default % of federation revenue into social-security reserve. |
| TDS Rate (%) — Sec 194O | `tdsRate` | Statutory 1% TDS configuration for tax-compliance reporting. |

### Why these matter for the Federation persona

- **Aggregation & oversight:** jurisdiction + governance fields seed the federation portal so it can
  group member cooperatives and link new ones on registration.
- **Financial configuration:** commission, welfare, and TDS defaults are set once at signup and reused
  platform-wide (can be overridden per cooperative/category), powering Earnings, Payouts & Tax reports.
- **Compliance:** TDS u/s 194O is a statutory requirement — capturing the rate at onboarding keeps tax
  reporting consistent with **Form 26AS** deductions.

---

## 4. Shared / Common account fields

These are now persisted for **all** roles (previously only name/email/phone/password were saved):

| Field | Model field | Why |
| --- | --- | --- |
| Profile Bio | `bio` | Shown on provider profiles and user profiles. |
| Location | `location` | Geo/region label used in search, booking, and analytics. |
| Avatar URL | `avatarUrl` | Profile picture (from Google sign-in or upload). |
| Address | `address` | Base address for all roles. |

---

## 5. Backend model changes

1. **`server/src/models/User.js`** — Household fields already existed in the schema
   (`emergencyContact`, `householdSize`, `prefLang`, `specialInstructions`); the controller now
   **persists them at signup** instead of them sitting empty until the Profile page is edited.
2. **`server/src/models/Cooperative.js`** — added `secretaryName` and `foundedYear`.
3. **`server/src/models/Federation.js`** — added `state`, `district`, `address`, `presidentName`,
   `secretaryName`, `contactEmail`, `contactPhone`.
4. **`server/src/controllers/authController.js` `signup()`**:
   - Persists `bio`, `location`, `avatarUrl`, `address`, `geoLocation` for all roles.
   - Household branch saves emergency contact, household size, preferred language, special
     instructions, notification prefs.
   - Federation Admin branch saves full jurisdiction, governance, contact, commission %, welfare %,
     TDS %.
   - Cooperative Admin branch saves office address, founded year, secretary, commission %, welfare %,
     full payout bank, and registration documents.
   - Fixed a bug where cooperative `documents` were nested under `cooperative` but read from top level —
     now read from both so uploads persist.

---

## 6. Operational / "real-time" wiring guarantee

Every field above is:
1. Captured in the React form (`useState`).
2. Validated (required markers, e.g. `*`, plus sensible `min`/`max`/`pattern`).
3. Sent through `signup()` → `POST /auth/signup`.
4. Persisted by the `signup` controller to the appropriate Mongo model.
5. **Immediately available** in the existing dashboards (Profile, Financials, Governance, Address
   Book, Emergency contact) — no re-entry needed.

---

## 7. Notes / cleanup

- Hardcoded example placeholders (e.g. `Himanshu Jha`, `Ramesh Kumar`, `Karol Bagh Artisan
  Cooperative Society`, `Dr. Anil Verma`) were replaced with neutral prompts, and pre-filled default
  values (e.g. `hourlyRate: "350"`, `state: "Delhi"`, `memberCount: "25"`, `commissionRate: "8"`)
  were removed so fields are never shown pre-filled with mock data.
- Dropdowns now start on a neutral `Select …` option rather than a pre-selected value.
- The Cooperative `region` string is built as `[district, state].filter(Boolean).join(", ")` so it
  degrades gracefully if the user leaves jurisdiction blank.