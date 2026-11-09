const products = [
  {
    id: "creator-kit",
    name: "Creator Growth Kit",
    category: "Templates",
    price: 1299,
    description: "Landing page templates, launch assets, and sales scripts for creators.",
    badge: "Best seller"
  },
  {
    id: "ai-vault",
    name: "AI Prompt Vault",
    category: "AI Resources",
    price: 999,
    description: "A curated bundle of prompt packs for content, design, and business growth.",
    badge: "Top rated"
  },
  {
    id: "brand-kit",
    name: "Brand Launch Pack",
    category: "Branding",
    price: 1499,
    description: "A complete system for launching your next personal brand with confidence.",
    badge: "New"
  },
  {
    id: "ebook",
    name: "Growth Playbook",
    category: "Ebook",
    price: 799,
    description: "A practical digital guide to building authority and monetizing your niche.",
    badge: "Popular"
  }
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

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function renderProducts() {
  productGrid.innerHTML = products
    .map(
      (product) => `
        <article class="product-card">
          <div class="product-image" aria-hidden="true"></div>
          <div class="meta">
            <span>${product.category}</span>
            <span>${product.badge}</span>
          </div>
          <h3>${product.name}</h3>
          <p>${product.description}</p>
          <div class="product-footer">
            <strong>${formatPrice(product.price)}</strong>
            <button class="btn btn-primary small add-to-cart" type="button" data-product="${product.id}">Add to cart</button>
          </div>
        </article>
      `
    )
    .join("");

  bindProductButtons();
}

function bindProductButtons() {
  document.querySelectorAll(".add-to-cart").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.dataset.product;
      const product = products.find((item) => item.id === productId);
      if (!product) return;

      const existing = cart.find((item) => item.id === product.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({ ...product, quantity: 1 });
      }

      renderCart();
      openCart();
    });
  });
}

function renderCart() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal;

  cartCounter.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  subtotalValue.textContent = formatPrice(subtotal);
  totalValue.textContent = formatPrice(total);
  drawerTotal.textContent = formatPrice(total);
  modalTotal.textContent = formatPrice(total);

  if (cart.length === 0) {
    checkoutItems.innerHTML = '<div class="checkout-item empty-state"><span>Your cart is empty.</span></div>';
    drawerBody.innerHTML = '<p class="empty-cart">No items yet.</p>';
    return;
  }

  checkoutItems.innerHTML = cart
    .map(
      (item) => `
        <div class="checkout-item">
          <div>
            <strong>${item.name}</strong>
            <span>Qty: ${item.quantity}</span>
          </div>
          <strong>${formatPrice(item.price * item.quantity)}</strong>
        </div>
      `
    )
    .join("");

  drawerBody.innerHTML = cart
    .map(
      (item) => `
        <div class="drawer-item">
          <div>
            <strong>${item.name}</strong>
            <span>Qty: ${item.quantity}</span>
          </div>
          <strong>${formatPrice(item.price * item.quantity)}</strong>
        </div>
      `
    )
    .join("");
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
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (!subtotal) return;
  paymentModal.classList.remove("hidden");
  closeCart();
}

function closePaymentModal() {
  paymentModal.classList.add("hidden");
}

const checkoutNowButton = document.getElementById("checkoutNow");
checkoutNowButton.addEventListener("click", openPaymentModal);

document.querySelector(".cart-button").addEventListener("click", openCart);
document.getElementById("closeCart").addEventListener("click", closeCart);
document.getElementById("drawerOverlay").addEventListener("click", closeCart);
document.getElementById("closeModal").addEventListener("click", closePaymentModal);
document.querySelector(".checkout-btn").addEventListener("click", openPaymentModal);

document.getElementById("paymentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "Processing...";

  setTimeout(() => {
    button.textContent = "Payment complete";
    form.reset();
    cart.length = 0;
    renderCart();
    setTimeout(() => {
      closePaymentModal();
      button.disabled = false;
      button.textContent = `Pay ${modalTotal.textContent}`;
    }, 1200);
  }, 1200);
});

renderProducts();
renderCart();
