
// Safety fix: make sure the product popup is closed on first page load.
window.addEventListener("load", () => {
  const modal = document.getElementById("productModal");
  if (modal) modal.hidden = true;
});

const U = window.BowUtils;
const S = window.BowStore;

const state = {
  q: "",
  category: "",
  status: "",
  showSold: false,
  adultVerified: localStorage.getItem("bow_adult_verified") === "yes",
  pendingAdultCategory: "",
  sort: "nameAsc",
  maxPrice: "",
  onlyImages: false,
  view: "grid"
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheEls();
  applyConfig();
  bindEvents();

  try {
    await S.fetchItems();
    document.getElementById("sheetStatus").textContent = "Listings are live";
    document.getElementById("loading").hidden = true;
    hydrateFilters();
    renderStats();
    renderDeals();
    renderProducts();
    renderCart();
    renderWishlist();
  } catch (err) {
    document.getElementById("loading").textContent = "Could not load current listings. Please try again later.";
    document.getElementById("sheetStatus").textContent = "Listings unavailable";
    console.error(err);
  }
}

function cacheEls() {
  [
    "globalSearch","searchBtn","categoryFilter","categorySearchSelect","statusFilter","sortSelect",
    "maxPriceFilter","onlyImagesFilter","showSoldFilter","adultModal","adultConfirmBtn","adultCancelBtn","clearFilters","productGrid","emptyState","cartBtn",
    "wishlistBtn","cartDrawer","wishlistDrawer","cartItems","wishlistItems","cartCount",
    "wishlistCount","cartTotal","checkoutBtn","modalClose","productModal","modalContent",
    "gridViewBtn","listViewBtn","mobileMenuBtn","navBar"
  ].forEach(id => els[id] = document.getElementById(id));
}

function applyConfig() {
  const cfg = window.STORE_CONFIG;
  document.getElementById("storeName").textContent = cfg.storeName;
  document.getElementById("storeSubtitle").textContent = cfg.storeSubtitle;
}

function bindEvents() {
  els.searchBtn.addEventListener("click", () => {
    state.q = els.globalSearch.value.trim().toLowerCase();
    renderProducts();
  });
  els.globalSearch.addEventListener("input", () => {
    state.q = els.globalSearch.value.trim().toLowerCase();
    renderProducts();
  });
  els.categorySearchSelect.addEventListener("change", e => {
    requestCategoryChange(e.target.value);
  });
  els.categoryFilter.addEventListener("change", e => {
    requestCategoryChange(e.target.value);
  });
  els.statusFilter.addEventListener("change", e => { state.status = e.target.value; renderProducts(); });
  els.showSoldFilter.addEventListener("change", e => { state.showSold = e.target.checked; renderProducts(); });
  els.sortSelect.addEventListener("change", e => { state.sort = e.target.value; renderProducts(); });
  els.maxPriceFilter.addEventListener("input", e => { state.maxPrice = e.target.value; renderProducts(); });
  els.onlyImagesFilter.addEventListener("change", e => { state.onlyImages = e.target.checked; renderProducts(); });

  els.clearFilters.addEventListener("click", () => {
    Object.assign(state, { q: "", category: "", status: "", showSold: false, sort: "nameAsc", maxPrice: "", onlyImages: false });
    els.globalSearch.value = "";
    els.categoryFilter.value = "";
    els.categorySearchSelect.value = "";
    els.statusFilter.value = "";
    els.showSoldFilter.checked = false;
    els.sortSelect.value = "nameAsc";
    els.maxPriceFilter.value = "";
    els.onlyImagesFilter.checked = false;
    renderProducts();
  });

  els.cartBtn.addEventListener("click", () => openDrawer("cart"));
  els.wishlistBtn.addEventListener("click", () => openDrawer("wishlist"));
  document.querySelectorAll("[data-close-drawer]").forEach(btn => btn.addEventListener("click", closeDrawers));
  els.checkoutBtn.addEventListener("click", buildContactMessage);
  els.modalClose.addEventListener("click", closeModal);
  els.productModal.addEventListener("click", e => { if (e.target === els.productModal) closeModal(); });

  els.gridViewBtn.addEventListener("click", () => setView("grid"));
  els.listViewBtn.addEventListener("click", () => setView("list"));
  els.mobileMenuBtn.addEventListener("click", () => els.navBar.classList.toggle("open"));
  els.adultConfirmBtn.addEventListener("click", confirmAdultCategory);
  els.adultCancelBtn.addEventListener("click", cancelAdultCategory);

  document.body.addEventListener("click", handleDynamicClicks);
}

function hydrateFilters() {
  const categories = [...new Set(S.items.map(x => x.category).filter(Boolean))].sort();
  for (const cat of categories) {
    const opt1 = new Option(cat, cat);
    const opt2 = new Option(cat, cat);
    els.categoryFilter.add(opt1);
    els.categorySearchSelect.add(opt2);
  }
}

function isAdultCategory(category) {
  return String(category || "").trim().toLowerCase() === "adult";
}

function requestCategoryChange(category) {
  if (isAdultCategory(category) && !state.adultVerified) {
    state.pendingAdultCategory = category;
    els.adultModal.hidden = false;
    els.categoryFilter.value = state.category || "";
    els.categorySearchSelect.value = state.category || "";
    return;
  }

  state.category = category;
  els.categoryFilter.value = category;
  els.categorySearchSelect.value = category;
  renderProducts();
}

function confirmAdultCategory() {
  state.adultVerified = true;
  localStorage.setItem("bow_adult_verified", "yes");
  els.adultModal.hidden = true;
  const category = state.pendingAdultCategory || "Adult";
  state.pendingAdultCategory = "";
  state.category = category;
  els.categoryFilter.value = category;
  els.categorySearchSelect.value = category;
  renderProducts();
}

function cancelAdultCategory() {
  state.pendingAdultCategory = "";
  els.adultModal.hidden = true;
  els.categoryFilter.value = state.category || "";
  els.categorySearchSelect.value = state.category || "";
}


function renderStats() {
  document.getElementById("statTotal").textContent = S.items.length;
  document.getElementById("statAvailable").textContent = S.items.filter(x => x.available).length;
  document.getElementById("statDeals").textContent = S.items.filter(x => x.discount).length;
}

function filteredItems() {
  let items = [...S.items];

  if (state.q) items = items.filter(x => x.searchText.includes(state.q));
  if (!state.showSold) items = items.filter(x => x.available);
  if (!state.adultVerified || !isAdultCategory(state.category)) {
    items = items.filter(x => !isAdultCategory(x.category));
  }
  if (state.category) items = items.filter(x => x.category === state.category);
  if (state.maxPrice) items = items.filter(x => x.salePrice <= Number(state.maxPrice));
  if (state.onlyImages) items = items.filter(x => x.images.length);

  if (state.status === "ebay") items = items.filter(x => x.onEbay);
  if (state.status === "discount") items = items.filter(x => x.discount);

  items.sort((a,b) => {
    if (state.sort === "priceLow") return a.salePrice - b.salePrice;
    if (state.sort === "priceHigh") return b.salePrice - a.salePrice;
    if (state.sort === "newest") return String(b.dateAdded).localeCompare(String(a.dateAdded));
    if (state.sort === "updated") return String(b.lastUpdated).localeCompare(String(a.lastUpdated));
    return a.name.localeCompare(b.name);
  });

  return items;
}

function renderDeals() {
  const deals = S.items.filter(x => x.discount || x.salePrice < x.itemValue).slice(0, 10);
  document.getElementById("dealRail").innerHTML = deals.length ? deals.map(item => `
    <button class="deal-card" data-open="${U.escape(item.id)}">
      <img src="${U.escape(item.images[0] || window.STORE_CONFIG.defaultImage)}" alt="">
      <span>${U.escape(item.name)}</span>
      <strong>${U.money(item.salePrice)}</strong>
    </button>
  `).join("") : "<p>No deals found yet. Add Discount values in your sheet to feature items here.</p>";
}

function renderProducts() {
  const items = filteredItems();
  els.productGrid.className = state.view === "list" ? "product-grid list" : "product-grid";
  els.emptyState.hidden = items.length > 0;
  els.productGrid.innerHTML = items.map(cardHtml).join("");
}

function cardHtml(item) {
  const image = item.images[0] || window.STORE_CONFIG.defaultImage;
  const badge = item.available ? "Available" : "Unavailable";
  const wish = S.wishlist.includes(item.id) ? "♥" : "♡";
  return `
    <article class="product-card">
      <button class="wish-btn" data-wish="${U.escape(item.id)}">${wish}</button>
      <button class="image-btn" data-open="${U.escape(item.id)}">
        <img src="${U.escape(image)}" alt="${U.escape(item.name)}" onerror="this.src='${window.STORE_CONFIG.defaultImage}'">
      </button>
      <div class="product-info">
        <p class="category">${U.escape(item.category)}</p>
        <h3><button data-open="${U.escape(item.id)}">${U.escape(item.name)}</button></h3>
        <p class="desc">${U.escape(item.description)}</p>
        <div class="price-row">
          <strong>${U.money(item.salePrice)}</strong>
          ${item.discount ? `<span class="discount">${U.escape(item.discount)}</span>` : ""}
        </div>
        <div class="meta">
          ${item.internalCode ? `<span>IC: ${U.escape(item.internalCode)}</span>` : ""}
          ${item.az ? `<span>AZ: ${U.escape(item.az)}</span>` : ""}
          <span class="${item.available ? "ok" : "bad"}">${badge}</span>
        </div>
        <div class="product-actions">
          <button data-cart="${U.escape(item.id)}" ${!item.available ? "disabled" : ""}>Add to cart</button>
          <button data-open="${U.escape(item.id)}">Details</button>
        </div>
      </div>
    </article>
  `;
}

function handleDynamicClicks(e) {
  const openId = e.target.closest("[data-open]")?.dataset.open;
  const cartId = e.target.closest("[data-cart]")?.dataset.cart;
  const wishId = e.target.closest("[data-wish]")?.dataset.wish;

  if (openId) openProduct(openId);
  if (cartId) {
    S.addToCart(cartId);
    renderCart();
    U.toast("Added to cart");
  }
  if (wishId) {
    S.toggleWishlist(wishId);
    renderWishlist();
    renderProducts();
    U.toast("Wishlist updated");
  }
}

function openProduct(id) {
  const item = S.itemById(id);
  if (!item) return;

  const gallery = (item.images.length ? item.images : [window.STORE_CONFIG.defaultImage]).map(src => `<img src="${U.escape(src)}" alt="">`).join("");

  els.modalContent.innerHTML = `
    <div class="product-modal-layout">
      <div class="modal-gallery">${gallery}</div>
      <div>
        <p class="category">${U.escape(item.category)}</p>
        <h2>${U.escape(item.name)}</h2>
        <div class="modal-price">${U.money(item.salePrice)}</div>
        <p>${U.escape(item.description)}</p>
        <dl class="detail-list">
          <dt>Item ID</dt><dd>${U.escape(item.itemId || "N/A")}</dd>
          <dt>Internal Code</dt><dd>${U.escape(item.internalCode || "N/A")}</dd>
          <dt>AZ</dt><dd>${U.escape(item.az || "N/A")}</dd>
          <dt>Available</dt><dd>${item.available ? "Yes" : "No"}</dd>
          <dt>Notes</dt><dd>${U.escape(item.notes || "N/A")}</dd>
          <dt>Last Updated</dt><dd>${U.escape(item.lastUpdated || "N/A")}</dd>
        </dl>
        <div class="modal-actions">
          <button data-cart="${U.escape(item.id)}" ${!item.available ? "disabled" : ""}>Add to cart</button>
          ${item.amazonLink ? `<a target="_blank" rel="noopener" href="${U.escape(item.amazonLink)}">View Reference Link</a>` : ""}
          ${item.ebayLink ? `<a target="_blank" rel="noopener" href="${U.escape(item.ebayLink)}">View Online Listing</a>` : ""}
        </div>
      </div>
    </div>
  `;
  els.productModal.hidden = false;
}

function closeModal() {
  els.productModal.hidden = true;
}

function renderCart() {
  els.cartCount.textContent = S.cart.reduce((sum, x) => sum + x.qty, 0);
  let total = 0;
  els.cartItems.innerHTML = S.cart.map(line => {
    const item = S.itemById(line.id);
    if (!item) return "";
    total += item.salePrice * line.qty;
    return `
      <div class="drawer-item">
        <img src="${U.escape(item.images[0] || window.STORE_CONFIG.defaultImage)}" alt="">
        <div>
          <strong>${U.escape(item.name)}</strong>
          <span>${line.qty} × ${U.money(item.salePrice)}</span>
          <button data-remove-cart="${U.escape(item.id)}">Remove</button>
        </div>
      </div>
    `;
  }).join("") || "<p>Your cart is empty.</p>";
  els.cartTotal.textContent = U.money(total);

  document.querySelectorAll("[data-remove-cart]").forEach(btn => btn.addEventListener("click", () => {
    S.removeFromCart(btn.dataset.removeCart);
    renderCart();
  }));
}

function renderWishlist() {
  els.wishlistCount.textContent = S.wishlist.length;
  els.wishlistItems.innerHTML = S.wishlist.map(id => {
    const item = S.itemById(id);
    if (!item) return "";
    return `
      <div class="drawer-item">
        <img src="${U.escape(item.images[0] || window.STORE_CONFIG.defaultImage)}" alt="">
        <div>
          <strong>${U.escape(item.name)}</strong>
          <span>${U.money(item.salePrice)}</span>
          <button data-open="${U.escape(item.id)}">View</button>
        </div>
      </div>
    `;
  }).join("") || "<p>Your wishlist is empty.</p>";
}

function openDrawer(type) {
  closeDrawers();
  if (type === "cart") els.cartDrawer.classList.add("open");
  if (type === "wishlist") els.wishlistDrawer.classList.add("open");
}

function closeDrawers() {
  els.cartDrawer.classList.remove("open");
  els.wishlistDrawer.classList.remove("open");
}

function setView(view) {
  state.view = view;
  els.gridViewBtn.classList.toggle("active", view === "grid");
  els.listViewBtn.classList.toggle("active", view === "list");
  renderProducts();
}

function buildContactMessage() {
  const lines = S.cart.map(line => {
    const item = S.itemById(line.id);
    return item ? `${line.qty}x ${item.name} (${item.internalCode || item.itemId}) - ${U.money(item.salePrice)}` : "";
  }).filter(Boolean);
  const message = encodeURIComponent("Hi, I am interested in these items:\n\n" + lines.join("\n"));
  window.location.href = `mailto:${window.STORE_CONFIG.contact.email || ""}?subject=Private Sales Order Request&body=${message}`;
}
