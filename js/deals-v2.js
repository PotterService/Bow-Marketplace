(() => {
  "use strict";

  const U = window.BowUtils;
  const S = window.BowStore;
  const $ = id => document.getElementById(id);

  const state = {
    deals: [],
    search: "",
    category: "",
    minimum: 0
  };

  function isSold(item) {
    return String(
      item?.availableStatus ??
      item?.raw?.["Available"] ??
      ""
    ).trim().toLowerCase() === "sold";
  }

  function discountPercent(item) {
    const fromSheet = String(item.discount || "").match(/\d+(?:\.\d+)?/);

    if (fromSheet) {
      return Number(fromSheet[0]) || 0;
    }

    const value = Number(item.itemValue || 0);
    const price = Number(item.salePrice || 0);

    if (value > 0 && price >= 0 && price < value) {
      return ((value - price) / value) * 100;
    }

    return 0;
  }

  function savingsAmount(item) {
    const value = Number(item.itemValue || 0);
    const sale = Number(item.salePrice || 0);
    return value > sale ? value - sale : 0;
  }

  function priceText(value) {
    return Number(value || 0).toLocaleString(undefined, {
      style: "currency",
      currency: "USD"
    });
  }

  function itemUrl(item) {
    return `item.html?id=${encodeURIComponent(item.id)}`;
  }

  function imageOf(item) {
    return item.images?.[0] || `../${STORE_CONFIG.defaultImage}`;
  }

  function dealLevel(percent) {
    if (percent >= 70) return { text: "Clearance", cls: "clearance" };
    if (percent >= 50) return { text: "Mega Deal", cls: "mega" };
    if (percent >= 25) return { text: "Great Deal", cls: "great" };
    return { text: "Sale", cls: "sale" };
  }

  function sortedDeals(items) {
    return items
      .filter(item => !isSold(item))
      .map(item => ({
        item,
        discount: discountPercent(item),
        savings: savingsAmount(item)
      }))
      .filter(entry => entry.discount > 0)
      .sort((a, b) =>
        b.discount - a.discount ||
        b.savings - a.savings ||
        String(a.item.name || "").localeCompare(String(b.item.name || ""))
      );
  }

  function filteredDeals() {
    return state.deals.filter(entry => {
      const item = entry.item;

      if (entry.discount < state.minimum) return false;
      if (state.category && item.category !== state.category) return false;

      if (state.search) {
        const haystack = [
          item.name,
          item.description,
          item.category,
          item.internalCode,
          item.availableStatus
        ].join(" ").toLowerCase();

        if (!haystack.includes(state.search.toLowerCase())) return false;
      }

      return true;
    });
  }

  function renderStats() {
    const categories = new Set(state.deals.map(entry => entry.item.category).filter(Boolean));
    const savings = state.deals.reduce((sum, entry) => sum + entry.savings, 0);
    const biggest = state.deals[0]?.discount || 0;

    $("dealStatCount").textContent = state.deals.length;
    $("dealStatBiggest").textContent = `${Math.round(biggest)}%`;
    $("dealStatSavings").textContent = priceText(savings);
    $("dealStatCategories").textContent = categories.size;
  }

  function hydrateCategories() {
    const categories = [...new Set(
      state.deals.map(entry => entry.item.category).filter(Boolean)
    )].sort();

    $("dealCategory").innerHTML =
      '<option value="">All Deal Categories</option>' +
      categories.map(category =>
        `<option value="${U.escape(category)}">${U.escape(category)}</option>`
      ).join("");
  }

  function renderTopDeal() {
    const top = filteredDeals()[0];
    const section = $("topDealSection");

    if (!top) {
      section.hidden = true;
      return;
    }

    const item = top.item;

    section.hidden = false;
    $("topDealImage").src = imageOf(item);
    $("topDealImage").alt = item.name || "Top deal";
    $("topDealName").textContent = item.name || "Featured Deal";
    $("topDealDescription").textContent =
      item.description || "One of the biggest savings currently available.";
    $("topDealPrice").textContent = priceText(item.salePrice);
    $("topDealWas").textContent =
      item.itemValue > item.salePrice ? `Was ${priceText(item.itemValue)}` : "";
    $("topDealSave").textContent =
      `${Math.round(top.discount)}% OFF • Save ${priceText(top.savings)}`;
    $("topDealView").href = itemUrl(item);
    $("topDealCart").dataset.cart = item.id;
  }

  function cardHtml(entry, index) {
    const item = entry.item;
    const level = dealLevel(entry.discount);
    const wish = S.wishlist.includes(item.id) ? "♥" : "♡";

    return `
      <article class="deal-card">
        <div class="deal-card-image">
          <span class="deal-ribbon">#${index + 1} • ${Math.round(entry.discount)}% OFF</span>
          <span class="deal-level ${level.cls}">${level.text}</span>

          <button
            class="wish-btn"
            data-wish="${U.escape(item.id)}"
            aria-label="Add ${U.escape(item.name)} to wishlist"
          >${wish}</button>

          <a href="${itemUrl(item)}">
            <img
              src="${U.escape(imageOf(item))}"
              alt="${U.escape(item.name)}"
              onerror="this.src='../${U.escape(STORE_CONFIG.defaultImage)}'"
            >
          </a>
        </div>

        <div class="deal-card-body">
          <p class="deal-category">${U.escape(item.category || "Other")}</p>
          <h3><a href="${itemUrl(item)}">${U.escape(item.name)}</a></h3>

          <p class="deal-description">
            ${U.escape(item.description || "Discounted Bow Marketplace listing.")}
          </p>

          <div class="deal-pricing">
            <div class="deal-now">
              <strong>Now ${priceText(item.salePrice)}</strong>
              ${
                item.itemValue > item.salePrice
                  ? `<span class="deal-was">Was ${priceText(item.itemValue)}</span>`
                  : ""
              }
            </div>

            <div class="deal-save-line">
              You save ${priceText(entry.savings)} • ${Math.round(entry.discount)}% off
            </div>
          </div>

          <div class="deal-actions">
            <a class="deal-view" href="${itemUrl(item)}">View Deal</a>
            <button class="deal-cart" data-cart="${U.escape(item.id)}">Add to Cart</button>
          </div>
        </div>
      </article>
    `;
  }

  function render() {
    const deals = filteredDeals();

    $("dealsCount").textContent =
      `${deals.length} deal${deals.length === 1 ? "" : "s"} shown`;

    $("dealsGrid").innerHTML = deals.length
      ? deals.map(cardHtml).join("")
      : `
        <div class="deal-empty">
          <h3>No matching deals</h3>
          <p>Try another search, category, or minimum discount.</p>
        </div>
      `;

    renderTopDeal();
  }

  async function init() {
    $("dealsGrid").innerHTML =
      '<div class="deal-empty"><h3>Loading deals...</h3></div>';

    try {
      await S.fetchItems();

      state.deals = sortedDeals(S.items);
      renderStats();
      hydrateCategories();
      render();
    } catch (error) {
      console.error("Deals could not load:", error);

      $("dealsCount").textContent = "Deals unavailable";
      $("dealsGrid").innerHTML = `
        <div class="deal-empty">
          <h3>Deals could not load</h3>
          <p>Please check the Google Sheet and its sharing settings.</p>
        </div>
      `;
    }
  }

  $("dealSearch").addEventListener("input", event => {
    state.search = event.target.value.trim();
    render();
  });

  $("dealCategory").addEventListener("change", event => {
    state.category = event.target.value;
    render();
  });

  $("dealMinimum").addEventListener("change", event => {
    state.minimum = Number(event.target.value || 0);
    render();
  });

  document.addEventListener("click", event => {
    const cart = event.target.closest("[data-cart]")?.dataset.cart;
    const wish = event.target.closest("[data-wish]")?.dataset.wish;

    if (cart) {
      S.addToCart(cart);
      U.toast("Added to cart");
    }

    if (wish) {
      S.toggleWishlist(wish);
      render();
      U.toast("Wishlist updated");
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
