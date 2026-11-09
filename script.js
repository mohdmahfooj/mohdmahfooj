const products = [
  { id: "creator-kit", name: "Creator Growth Kit", category: "Templates", price: 1299, description: "Landing page templates, launch assets, and sales scripts for creators.", badge: "Best seller" },
  { id: "ai-vault", name: "AI Prompt Vault", category: "AI Resources", price: 999, description: "A curated bundle of prompt packs for content, design, and business growth.", badge: "Top rated" },
  { id: "brand-kit", name: "Brand Launch Pack", category: "Branding", price: 1499, description: "A complete system for launching your next personal brand with confidence.", badge: "New" },
  { id: "ebook", name: "Growth Playbook", category: "Ebook", price: 799, description: "A practical digital guide to building authority and monetizing your niche.", badge: "Popular" }
];

const cart = [];
const productGrid = document.getElementById("productGrid");
const cartCounter = document.getElementById("cartCounter");
const checkoutItems = document.getElementById("checkoutItems");
const subtotalValue = document.getElementById("subtotalValue");
const totalValue = document.getElementById("totalValue");
const drawerBody = document.getElementById("drawerBody");
const drawerTotal = document.getElementById("drawerTotal");
const modalTotal = document.getElementById("modalTotal");
const cartDrawer = document.getElementById("cartDrawer");
const drawerOverlay = document.getElementById("drawerOverlay");
const paymentModal = document.getElementById("paymentModal");
const paymentForm = document.getElementById("paymentForm");

const premiumStyles = document.createElement("link");
premiumStyles.rel = "stylesheet";
premiumStyles.href = "premium.css";
document.head.appendChild(premiumStyles);

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function renderProducts() {
  productGrid.innerHTML = products.map((product) => `
    <article class="product-card">
      <div class="product-image" aria-hidden="true"></div>
      <div class="meta"><span>${product.category}</span><span>${product.badge}</span></div>
      <h3>${product.name}</h3><p>${product.description}</p>
      <div class="product-footer"><strong>${formatPrice(product.price)}</strong>
        <button class="btn btn-primary small add-to-cart" type="button" data-product="${product.id}">Add to cart</button>
      </div>
    </article>`).join("");

  document.querySelectorAll(".add-to-cart").forEach((button) => {
    button.addEventListener("click", () => {
      const product = products.find((item) => item.id === button.dataset.product);
      if (!product) return;
      const existing = cart.find((item) => item.id === product.id);
      existing ? existing.quantity++ : cart.push({ ...product, quantity: 1 });
      renderCart();
      openCart();
    });
  });
}

function renderCart() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartCounter.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  subtotalValue.textContent = formatPrice(subtotal);
  totalValue.textContent = formatPrice(subtotal);
  drawerTotal.textContent = formatPrice(subtotal);
  modalTotal.textContent = formatPrice(subtotal);

  if (!cart.length) {
    checkoutItems.innerHTML = '<div class="checkout-item empty-state"><span>Your cart is empty.</span></div>';
    drawerBody.innerHTML = '<p class="empty-cart">No items yet.</p>';
    return;
  }
  checkoutItems.innerHTML = cart.map((item) => `<div class="checkout-item"><div><strong>${item.name}</strong><span>Qty: ${item.quantity}</span></div><strong>${formatPrice(item.price * item.quantity)}</strong></div>`).join("");
  drawerBody.innerHTML = cart.map((item) => `<div class="drawer-item"><div><strong>${item.name}</strong><span>Qty: ${item.quantity}</span></div><strong>${formatPrice(item.price * item.quantity)}</strong></div>`).join("");
}

function openCart() {
  cartDrawer.classList.remove("hidden");
  drawerOverlay.classList.remove("hidden");
}
function closeCart() {
  cartDrawer.classList.add("hidden");
  drawerOverlay.classList.add("hidden");
}
function openPaymentModal() {
  if (!cart.length) return;
  paymentModal.classList.remove("hidden");
  closeCart();
}
function closePaymentModal() { paymentModal.classList.add("hidden"); }

// Replace the demo card fields. Card details are collected only by Razorpay Checkout.
paymentForm.innerHTML = `
  <p class="payment-note">Your payment is securely handled by Razorpay. inClub never sees or stores your card details.</p>
  <label>Full name<input name="name" type="text" autocomplete="name" placeholder="Your name" maxlength="100" required /></label>
  <label>Email address<input name="email" type="email" autocomplete="email" placeholder="you@example.com" maxlength="254" required /></label>
  <button type="submit" class="btn btn-primary wide">Continue to secure payment <span id="modalTotal">${formatPrice(0)}</span></button>
  <p class="payment-status" id="paymentStatus" role="status" aria-live="polite"></p>`;

async function loadRazorpay() {
  if (window.Razorpay) return true;
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

paymentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!cart.length) return;
  const submitButton = paymentForm.querySelector("button[type='submit']");
  const status = document.getElementById("paymentStatus");
  const customerName = paymentForm.elements.name.value.trim();
  const customerEmail = paymentForm.elements.email.value.trim();
  submitButton.disabled = true;
  status.textContent = "Preparing secure checkout…";

  try {
    const sdkLoaded = await loadRazorpay();
    if (!sdkLoaded) throw new Error("Razorpay checkout could not load. Check your connection and try again.");

    // Only product IDs and quantities go to the server; server-side catalog sets the amount.
    const response = await fetch("/api/checkout/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart.map(({ id, quantity }) => ({ id, quantity })) })
    });
    const order = await response.json();
    if (!response.ok) throw new Error(order.error || "Could not create payment order.");

    const checkout = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "inClub",
      description: "Digital products",
      order_id: order.orderId,
      prefill: { name: customerName, email: customerEmail },
      theme: { color: "#ed343c" },
      modal: { ondismiss: () => { submitButton.disabled = false; status.textContent = "Checkout closed. Your cart is still saved."; } },
      handler: async (payment) => {
        status.textContent = "Verifying payment securely…";
        try {
          const verifyResponse = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payment)
          });
          const result = await verifyResponse.json();
          if (!verifyResponse.ok || !result.verified) throw new Error(result.error || "Payment verification failed.");
          status.textContent = "Payment verified. Thank you for your purchase!";
          cart.length = 0;
          renderCart();
          setTimeout(closePaymentModal, 1800);
        } catch (error) {
          status.textContent = `${error.message} Please contact support with your payment ID: ${payment.razorpay_payment_id || "unavailable"}.`;
        } finally {
          submitButton.disabled = false;
        }
      }
    });
    checkout.on("payment.failed", (event) => {
      status.textContent = event.error?.description || "Payment was not completed. Please try again.";
      submitButton.disabled = false;
    });
    checkout.open();
  } catch (error) {
    status.textContent = error.message;
    submitButton.disabled = false;
  }
});

document.getElementById("checkoutNow").addEventListener("click", openPaymentModal);
document.querySelector(".cart-button").addEventListener("click", openCart);
document.getElementById("closeCart").addEventListener("click", closeCart);
document.getElementById("drawerOverlay").addEventListener("click", closeCart);
document.getElementById("closeModal").addEventListener("click", closePaymentModal);
document.querySelector(".checkout-btn").addEventListener("click", openPaymentModal);

renderProducts();
renderCart();
