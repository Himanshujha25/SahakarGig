# Auth System — Common Documentation

## Overview
JWT-based authentication with OTP phone verification. All roles (household, provider, cooperative, admin) share the same auth flow with role-specific redirects post-login.

## Flow

```
Signup → OTP (phone) → JWT issued → Role-based redirect
Login  → Password check → JWT issued → Role-based redirect
```

## Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login with email+password |
| POST | `/api/auth/send-otp` | Send OTP to phone |
| POST | `/api/auth/verify-otp` | Verify OTP |
| POST | `/api/auth/change-password` | Change password (auth required) |
| GET | `/api/auth/me` | Get current user profile |

## ✅ Implemented
- [x] Email + password signup/login
- [x] Phone OTP verification (Nodemailer / SMS stub)
- [x] JWT token generation and validation
- [x] Role-based route guards (`RoleRoute.jsx`)
- [x] Protected routes for all 4 portals
- [x] Password hashing (bcrypt)

## ❌ Not Yet Implemented
- [ ] Refresh tokens (access token expires → force logout)
- [ ] Forgot password / reset password via email link
- [ ] Google/Social OAuth
- [ ] Account lockout after N failed login attempts
- [ ] Rate limiting on `/api/auth/*` endpoints
- [ ] HTTPS enforcement in production
- [ ] Token blacklist on logout

## Security Notes
> ⚠️ JWT stored in `localStorage` is vulnerable to XSS. For production, move to `httpOnly` cookies.
> ⚠️ No rate limiting means brute-force on `/login` is trivially possible.
