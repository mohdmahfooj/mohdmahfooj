# inClub Digital Store

A premium, responsive storefront for digital products with a server-created Razorpay order and server-side payment-signature verification.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and add your Razorpay **test** credentials from the Razorpay Dashboard. Never commit `.env` or put the secret key in browser code.
3. Install dependencies and start the server:

   ```sh
   npm install
   npm run dev
   ```

4. Open `http://localhost:3000`. Test checkout using Razorpay test mode and its test payment methods.

## Payment security included

- Browser sends only product IDs and quantities; the server calculates amounts from its own catalog.
- Razorpay orders are created by the server, with secret credentials kept in environment variables.
- The browser opens Razorpay Checkout; this site does not collect card numbers or CVVs.
- The payment response is verified on the server using Razorpay's HMAC signature and constant-time comparison.
- Basic checkout rate limiting and security headers are enabled.
- A raw-body webhook endpoint verifies `x-razorpay-signature` when `RAZORPAY_WEBHOOK_SECRET` is configured.

## Before accepting live orders

1. Complete Razorpay merchant onboarding and use test keys first. Configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and a strong unique webhook secret only in the hosting provider's secret/environment settings.
2. Deploy behind HTTPS and configure the Razorpay webhook URL as `https://YOUR-DOMAIN/api/razorpay/webhook`; subscribe to payment/order events you need.
3. Add a persistent order database and idempotent webhook processing before providing digital downloads. This starter verifies payments but intentionally does **not** store orders, issue download links, or fulfill products.
4. Review product prices, taxes, refund policy, privacy/terms, support details, and applicable payment/business requirements before going live.

Never use real payment details in the demo form or share API secrets in chat or commits. The storefront must be served by this Node server (or equivalent backend); opening the HTML directly will not support checkout.
