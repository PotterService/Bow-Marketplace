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

    if (value > 0 && price > 0 && price < value) {
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
    const price = Number(value || 0);
    if (!Number.isFinite(price) || price <= 0) return "Contact";
    return price.toLocaleString(undefined, { style: "currency", currency: "USD" });
  }

  function itemUrl(item) {
    return `item.html?id=${encodeURIComponent(item.id)}`;
  }

  function imageOf(item) {
    return item.images?.[0] || `../${STORE_CONFIG.defaultImage}`;
  }

  function amazonUrl(item) {
    return item.amazonLink || `https://www.amazon.com/s?k=${encodeURIComponent(item.name || "")}`;
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
      item.description || "Compare the Amazon price with Bow’s price.";
    $("topDealPrice").textContent = `Bow Price ${priceText(item.salePrice)}`;
    $("topDealWas").textContent =
      item.itemValue > 0 ? `Amazon ${priceText(item.itemValue)}` : "";
    $("topDealSave").textContent =
      `${Math.round(top.discount)}% OFF • Save ${priceText(top.savings)}`;
    $("topDealView").href = itemUrl(item);
    $("topDealAmazon").href = amazonUrl(item);
  }

  function cardHtml(entry) {
    const item = entry.item;
    const wish = S.wishlist.includes(item.id) ? "♥" : "♡";
    const amazon = amazonUrl(item);

    return `
      <article class="product-card">
        <button class="wish-btn" data-wish="${U.escape(item.id)}">${wish}</button>
        <a class="image-btn" href="${itemUrl(item)}" style="position:relative;display:block">
          <span class="bow-photo-discount">${Math.round(entry.discount)}% OFF</span>
          <img src="${U.escape(imageOf(item))}" alt="${U.escape(item.name)}" onerror="this.src='../${U.escape(STORE_CONFIG.defaultImage)}'">
        </a>
        <div class="product-info">
          <p class="category">${U.escape(item.category || "Other")}</p>
          <h3><a href="${itemUrl(item)}">${U.escape(item.name)}</a></h3>
          <p class="desc">${U.escape(item.description || "Discounted Bow Marketplace listing.")}</p>
          <div class="bow-price-compare">${Number(item.itemValue||0)>0?`<div class="amazon-price"><span>Amazon</span><del>${priceText(item.itemValue)}</del></div>`:""}<div class="our-price"><span>Bow Price</span><strong>${priceText(item.salePrice)}</strong></div></div>
          <div class="meta">
            ${item.internalCode ? `<span>IC: ${U.escape(item.internalCode)}</span>` : ""}
            <span class="ok">${U.escape(item.availableStatus || "Available")}</span>
          </div>
          <div class="product-actions">
            
            <a class="button-link" target="_blank" rel="noopener" href="${U.escape(amazon)}">View on Amazon</a>
            <a class="button-link secondary-action" href="${itemUrl(item)}">Item Page</a>
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
    const wish = event.target.closest("[data-wish]")?.dataset.wish;


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
