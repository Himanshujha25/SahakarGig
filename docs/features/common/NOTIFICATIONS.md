# Notification System — Common Documentation

## Overview
Two-layer notification system: in-app bell (Socket.io + DB polling) and email (Nodemailer).

## In-App Notifications
- **Bell component:** `NotificationBell.jsx`
- **Model:** `server/src/models/Notification.js`
- **Routes:** `server/src/routes/notifications.js`
- Socket.io emits `notification` events when booking status changes

## Email Notifications
- **Utility:** `server/src/utils/email.js`
- Triggered on: booking accepted, booking completed, dispute filed, payout processed

## ✅ Implemented
- [x] In-app notification bell with unread count badge
- [x] Notification stored in MongoDB (Notification model)
- [x] Email on booking status changes (Nodemailer)
- [x] Mark as read functionality
- [x] Toast notifications (`NotificationToasts.jsx`)
- [x] Socket.io event push on booking state change

## ❌ Not Yet Implemented
- [ ] Push notifications (Web Push API / Firebase FCM)
- [ ] SMS notifications (Twilio / MSG91)
- [ ] Notification preferences per user (email on/off, push on/off)
- [ ] Notification categories and filtering
- [ ] Notification history pagination
- [ ] Admin broadcast notifications to all providers/households

## Notification Types

| Event | In-App | Email |
|-------|--------|-------|
| Booking requested | Provider ✅ | Provider ✅ |
| Booking accepted | Household ✅ | Household ✅ |
| Booking completed | Household ✅ | Household ✅ |
| Booking cancelled | Both ✅ | Both ✅ |
| Dispute filed | Admin ✅ | Admin ⚠️ partial |
| Payout processed | Provider ✅ | Provider ✅ |
| Welfare announcement | Provider ❌ | Provider ❌ |
