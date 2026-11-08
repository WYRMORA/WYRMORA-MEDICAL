# Khalti ePayment integration

This implements Khalti KPG-2 web checkout according to the official merchant documentation: server-side initiate, redirect to the returned payment_url, then server-side lookup using pidx. Only provider lookup status `Completed` is treated as paid. Browser callback query parameters are never trusted as proof of payment.

## Secrets

- KHALTI_SECRET_KEY: merchant secret key (sandbox key for testing; live key only after approvals)
- KHALTI_ENV: `sandbox` or `production`
- KHALTI_RETURN_URL: HTTPS callback URL
- KHALTI_WEBSITE_URL: HTTPS website URL

Sandbox API base: https://dev.khalti.com/api/v2
Production API base: https://khalti.com/api/v2

## API

- POST /api/payments/khalti/initiate { "orderId": 123 } — creates a payment request for the authenticated customer's eligible non-test order and returns the payment URL.
- POST /api/payments/khalti/verify { "pidx": "..." } — server calls Khalti lookup and marks the order paid only for a matching amount and Completed status.
- GET /api/payments/mine — authenticated customer's payment history.
- POST /api/payments/:id/refund-request — customer asks for a refund.
- PATCH /api/payments/:id/refund-confirm — Super Admin records the provider refund transaction ID after independently confirming the refund in the merchant dashboard.

Khalti's documented web checkout flow requires lookup after callback; the callback's status alone is not authoritative. The current Khalti KPG-2 docs do not specify an automatic refund endpoint in this flow, so refunds are deliberately not claimed as automated: execute the refund through the merchant dashboard and then reconcile it using the admin endpoint. Repeated lookup callbacks are recorded idempotently in payment_events.

## Guardrails

Marketplace orders remain disabled by default. No payment is accepted until ENABLE_MARKETPLACE_ORDERS is enabled after legal, pharmacy and provider approvals. Keep live keys out of source control. Test in sandbox and reconcile successful, canceled, pending, duplicate and amount-mismatch cases before live activation.
