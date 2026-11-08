# Account email verification and recovery

The API supports one-time email verification and password-reset links. Customer email enforcement is controlled by `REQUIRE_VERIFIED_EMAIL` and remains opt-in until email delivery is configured and tested.

## Required environment

- `PUBLIC_APP_URL`: public HTTPS origin for the frontend (for example, `https://app.example.com`).
- `RESEND_API_KEY`: API key for the Resend email provider.
- `EMAIL_FROM`: verified sender identity accepted by the provider.

Never commit these values. Configure them in the hosting provider's secret manager. Email delivery is intentionally unavailable until all three settings are correctly configured. While unconfigured, request endpoints return the same generic response without looking up the supplied account, preventing account enumeration.

## API

- `POST /api/account/email-verification/request` with `{ "email": "..." }`
- `POST /api/account/email-verification/confirm` with `{ "token": "..." }`
- `POST /api/account/password-reset/request` with `{ "email": "..." }`
- `POST /api/account/password-reset/confirm` with `{ "token": "...", "password": "..." }`

Tokens are generated from 256 bits of cryptographic randomness, stored only as SHA-256 hashes, expire after 30 minutes, and are single-use. A newer request invalidates previous outstanding tokens for the same purpose. Reset requests return a generic response to reduce account enumeration. Password reset invalidates outstanding reset and verification tokens.

## Frontend behavior

The Customer Portal now provides a password-reset request form, reset-token confirmation screen, and email-verification request/confirmation flow. The links open the application at `/reset-password` or `/verify-email` and the portal reads the token query parameter. Do not place raw tokens in analytics, logs, or third-party scripts. Configure the frontend route to read the token query parameter and submit it in the request body, then remove it from browser history.

## Operational checks

Send test messages only after the sender domain is verified. Check delivery, bounce and complaint handling in the provider dashboard. Apply provider-side sending limits and monitor abuse. This integration does not itself establish legal compliance or prove control of an email address until the user completes the verification link.


## Enforcing verified customer email

Set `REQUIRE_VERIFIED_EMAIL=true` only after Resend sender verification and the HTTPS `PUBLIC_APP_URL` are confirmed.

When enabled:
- New customer registration does not issue an authenticated session. The portal automatically requests a verification email and shows the verification-request screen.
- Customer login is blocked until `email_verified_at` is set by completing the one-time link.
- Existing customer sessions without verified email are also blocked by the authentication middleware.
- The login screen offers a verification-link request form, so unverified customers can recover access without an active session.
- This flag applies to customer accounts only; it does not change Super Admin, seller, or pharmacist authentication.

Before enabling it in production, test registration, delivery, link confirmation, logout/login, and an existing unverified account. If email delivery is unavailable, keep the flag false; otherwise new customers cannot sign in.
