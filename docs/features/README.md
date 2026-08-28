# SahakarGig — Features Documentation Index

> Central index for all feature documentation. Navigate to any portal or common module below.

---

## 📂 Structure

```
docs/features/
├── README.md                              ← You are here
│
├── common/                                ← Cross-cutting shared features
│   ├── OVERVIEW.md                        ← Full common feature list + tech stack
│   ├── AUTH.md                            ← Authentication & JWT system
│   ├── NOTIFICATIONS.md                   ← In-app + email notification system
│   ├── AI_CHATBOT.md                      ← Gemini AI chatbot + voice search
│   └── THEME_SYSTEM.md                    ← Light/dark/system theme + CSS variables
│
├── provider/                              ← Gig Worker portal (/provider/*)
│   └── PROVIDER_FEATURES.md              ← Implemented + pending provider features
│
├── household/                             ← Customer portal (/household/*)
│   └── HOUSEHOLD_FEATURES.md             ← Implemented + pending household features
│
├── federation/                            ← Cooperative Federation portal (/federation/*)
│   └── FEDERATION_FEATURES.md            ← Implemented + pending federation features
│
└── cooperative/                           ← Individual Cooperative + Admin
    ├── COOPERATIVE_FEATURES.md           ← Cooperative model, planned portal
    └── ADMIN_FEATURES.md                 ← Platform super-admin portal (/admin/*)
```

---

## 🚦 Feature Status Summary

| Portal | Implemented | Pending |
|--------|-------------|---------|
| **Common / Shared** | Auth, Theme, AI, Notifications, Badges, PWA | Refresh tokens, Rate limiting, i18n, Push notifs, Tests |
| **Provider** | Job queue, Earnings, Profile, Welfare, Announcements, Dispatch | Bank linking, Withdrawal, Chat, Calendar, QR ID card |
| **Household** | Discovery, Booking, Tracking, Payment, Invoice, Dispatch | Map view, Chat, Review UI, Dispute filing, Wallet |
| **Federation** | Dashboard, Cooperative list/detail, Earnings, Settings | Verification queue, Dispute resolution, Analytics charts |
| **Cooperative** | Model, association, commission split | Standalone portal, Member management, Welfare fund |
| **Admin** | Dashboard, Provider list/detail, Verifications, Disputes, Commission | Bulk actions, Payout initiation, Audit log, Feature flags |

---

## 🔗 Quick Links

- [Common Overview](./common/OVERVIEW.md)
- [Auth System](./common/AUTH.md)
- [Notification System](./common/NOTIFICATIONS.md)
- [AI Chatbot](./common/AI_CHATBOT.md)
- [Theme System](./common/THEME_SYSTEM.md)
- [Provider Features](./provider/PROVIDER_FEATURES.md)
- [Household Features](./household/HOUSEHOLD_FEATURES.md)
- [Federation Features](./federation/FEDERATION_FEATURES.md)
- [Cooperative Features](./cooperative/COOPERATIVE_FEATURES.md)
- [Admin Features](./cooperative/ADMIN_FEATURES.md)
