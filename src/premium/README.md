# Premium, Payments, and Notifications

This directory owns premium access logic so subscription/paywall code stays separate from accounting and inventory code.

## Current app-side behavior

- New users can start a 14-day trial.
- After trial expiry, protected app routes are blocked by `SubscriptionGate`.
- Plans:
  - Weekly: KES 100
  - Monthly: KES 300
  - Lifetime: KES 9,999
- M-Pesa STK Push is scaffolded, but access unlocks only after backend verification.
- Local business alerts are enabled for all users:
  - Low stock
  - Open debtor/creditor balances
  - End-of-day collection not recorded
- Expo push token registration is ready for a backend endpoint.

## Required environment variables

Set these before production builds or in EAS environment variables:

```text
EXPO_PUBLIC_PAYMENTS_API_URL=https://your-api.example.com
EXPO_PUBLIC_NOTIFICATIONS_API_URL=https://your-api.example.com
```

## Required backend endpoints

The mobile app expects:

```text
POST /payments/mpesa/stk-push
GET  /payments/mpesa/verify/:checkoutRequestId
POST /notifications/register-device
```

The backend must keep these Daraja values secret:

```text
DARAJA_CONSUMER_KEY
DARAJA_CONSUMER_SECRET
DARAJA_PASSKEY
DARAJA_SHORTCODE_OR_TILL
DARAJA_CALLBACK_URL
```

Do not put Daraja secrets or your Till/Paybill credentials in the mobile app. The app can be reverse engineered.

## Production hardening

The current local trial/subscription storage is useful for app gating, but serious paid access should also be tied to a backend account/business record. A determined user can tamper with local device storage. For premium billing, backend verification should be the source of truth.
