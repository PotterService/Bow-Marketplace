(function(){
  "use strict";

  const U = window.BowUtils;
  const S = window.BowStore;

  function isSold(item){
    return String(item?.availableStatus ?? item?.raw?.["Available"] ?? "").trim().toLowerCase() === "sold";
  }

  function getDiscountNumber(item){
    const fromSheet = String(item.discount || "").match(/\d+(\.\d+)?/);
    if (fromSheet) return Number(fromSheet[0]) || 0;

    const value = Number(item.itemValue || 0);
    const price = Number(item.salePrice || 0);
    if (value > 0 && price > 0 && price < value) {
      return Math.round(((value - price) / value) * 100);
    }
    return 0;
  }

  function discountLabel(item){
    const n = getDiscountNumber(item);
    if (!n) return "";
    return `${Math.round(n)}% off`;
  }

  function cardHtml(i){
    const sold = isSold(i);
    const img = i.images?.[0] || STORE_CONFIG.defaultImage;
    const url = `item.html?id=${encodeURIComponent(i.id)}`;
    const wish = S.wishlist.includes(i.id) ? "♥" : "♡";
    const discount = discountLabel(i);

    return `
      <article class="product-card bow-deal-card ${sold ? "sold-card" : ""}">
        ${discount ? `<div class="bow-deal-ribbon">${U.escape(discount.toUpperCase())}</div>` : ""}
        <button class="wish-btn" data-wish="${U.escape(i.id)}">${wish}</button>

        <a class="image-btn" href="${url}">
          <img src="${U.escape(img)}" alt="${U.escape(i.name)}" onerror="this.src='${STORE_CONFIG.defaultImage}'">
        </a>

        <div class="product-info">
          <p class="category">${U.escape(i.category)}</p>
          <h3><a href="${url}">${U.escape(i.name)}</a></h3>

          ${i.internalCode ? `<div class="bow-ic-pill">IC: ${U.escape(i.internalCode)}</div>` : ""}

          <div class="bow-price-line">
            <strong>${U.priceText(i.salePriceRaw)}</strong>
            ${i.itemValue && i.itemValue > i.salePrice ? `<div class="bow-value">Value <span>${U.priceText(i.itemValue)}</span></div>` : ""}
          </div>

          ${discount ? `<div class="bow-discount-bar">${U.escape(discount)}</div>` : ""}

          <div class="mini-meta">
            <span>Status: ${U.escape(i.availableStatus || "Available")}</span>
          </div>

          <div class="product-actions">
            ${sold && i.amazonLink ? `<a class="button-link" target="_blank" href="${U.escape(i.amazonLink)}">Buy on Amazon</a>` : `<button data-cart="${U.escape(i.id)}">Add to cart</button>`}
            <a class="button-link secondary-action" href="${url}">View Item</a>
          </div>
        </div>
      </article>
    `;
  }

  async function initDeals(){
    const grid = document.getElementById("dealsGrid");
    const count = document.getElementById("dealsCount");
    if (!grid) return;

    try {
      await S.fetchItems();

      const deals = S.items
        .filter(item => !isSold(item))
        .filter(item => getDiscountNumber(item) > 0)
        .sort((a,b) => getDiscountNumber(b) - getDiscountNumber(a));

      if (count) count.textContent = `${deals.length} deal${deals.length === 1 ? "" : "s"} found`;

      grid.innerHTML = deals.length
        ? deals.map(cardHtml).join("")
        : `<div class="empty-state"><h3>No deals found</h3><p>Add discounts in your inventory sheet to show items here.</p></div>`;
    } catch (err) {
      console.error("Deals could not load", err);
      if (count) count.textContent = "Deals unavailable";
      grid.innerHTML = `<div class="empty-state"><h3>Deals could not load</h3><p>Please check your Google Sheet share settings.</p></div>`;
    }
  }

  document.addEventListener("click", function(e){
    const cart = e.target.closest("[data-cart]")?.dataset.cart;
    const wish = e.target.closest("[data-wish]")?.dataset.wish;

    if (cart) {
      S.addToCart(cart);
      U.toast("Added to cart");
    }

    if (wish) {
      S.toggleWishlist(wish);
      initDeals();
      U.toast("Wishlist updated");
    }
  });

  document.addEventListener("DOMContentLoaded", initDeals);
})();