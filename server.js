const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Razorpay = require("razorpay");
const crypto = require("node:crypto");
require("dotenv").config();

const app = express();
const port = Number(process.env.PORT || 3000);
const publicKey = process.env.RAZORPAY_KEY_ID;
const secretKey = process.env.RAZORPAY_KEY_SECRET;
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

const products = {
  "creator-kit": { name: "Creator Growth Kit", price: 1299 },
  "ai-vault": { name: "AI Prompt Vault", price: 999 },
  "brand-kit": { name: "Brand Launch Pack", price: 1499 },
  ebook: { name: "Growth Playbook", price: 799 }
};

const razorpay = publicKey && secretKey
  ? new Razorpay({ key_id: publicKey, key_secret: secretKey })
  : null;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.static(__dirname));

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

// Razorpay webhook signature must be computed from the exact raw request body.
app.post("/api/razorpay/webhook", express.raw({ type: "application/json" }), (req, res) => {
  if (!webhookSecret) return res.status(503).send("Webhook is not configured");
  const received = req.get("x-razorpay-signature") || "";
  const expected = crypto.createHmac("sha256", webhookSecret).update(req.body).digest("hex");
  const receivedBuffer = Buffer.from(received, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (receivedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) {
    return res.status(400).send("Invalid webhook signature");
  }

  // Configure this endpoint in Razorpay. Persist payment events and fulfill digital orders
  // only after implementing your trusted order database and download-access flow.
  return res.status(200).json({ received: true });
});

app.use(express.json({ limit: "20kb" }));

function requireRazorpay(req, res, next) {
  if (!razorpay) {
    return res.status(503).json({ error: "Payments are not configured. Add Razorpay credentials on the server." });
  }
  next();
}

app.post("/api/checkout/orders", checkoutLimiter, requireRazorpay, async (req, res) => {
  try {
    const items = req.body?.items;
    if (!Array.isArray(items) || items.length < 1 || items.length > 10) {
      return res.status(400).json({ error: "Your cart is empty or invalid." });
    }

    let amount = 0;
    const orderItems = [];
    for (const item of items) {
      const product = products[item?.id];
      const quantity = Number(item?.quantity);
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        return res.status(400).json({ error: "A product or quantity in your cart is invalid." });
      }
      amount += product.price * quantity;
      orderItems.push({ id: item.id, name: product.name, quantity });
    }

    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 500000) {
      return res.status(400).json({ error: "The order amount is invalid." });
    }

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `inclub_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      notes: { products: orderItems.map(({ id, quantity }) => `${id}:${quantity}`).join(",") }
    });

    return res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: publicKey });
  } catch (error) {
    console.error("Razorpay order creation failed:", error.message);
    return res.status(502).json({ error: "Could not start checkout. Please try again." });
  }
});

app.post("/api/checkout/verify", checkoutLimiter, requireRazorpay, (req, res) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
  if (![orderId, paymentId, signature].every((value) => typeof value === "string" && value.length > 0)) {
    return res.status(400).json({ error: "Payment verification details are incomplete." });
  }

  const expected = crypto.createHmac("sha256", secretKey).update(`${orderId}|${paymentId}`).digest("hex");
  const receivedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (receivedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) {
    return res.status(400).json({ error: "Payment signature could not be verified." });
  }

  return res.json({ verified: true, paymentId });
});

app.listen(port, () => {
  console.log(`inClub store listening on port ${port}`);
});
