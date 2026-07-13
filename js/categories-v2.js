(() => {
  "use strict";

  const U = window.BowUtils;
  const S = window.BowStore;
  const $ = id => document.getElementById(id);

  const state = {
    categories: [],
    search: "",
    sort: "items"
  };

  const iconRules = [
    [["card", "pokemon", "magic", "tcg", "trading"], "🃏"],
    [["game", "gaming", "video"], "🎮"],
    [["board"], "🎲"],
    [["electronic", "computer", "phone", "tech"], "💻"],
    [["collectible", "figure", "toy"], "🧸"],
    [["book", "media", "movie"], "📚"],
    [["clothing", "apparel", "shoe"], "👕"],
    [["home", "house", "decor"], "🏠"],
    [["beauty", "makeup"], "💄"],
    [["automotive", "car"], "🚗"],
    [["adult"], "🔞"]
  ];

  function isSold(item) {
    return String(
      item?.availableStatus ??
      item?.raw?.["Available"] ??
      ""
    ).trim().toLowerCase() === "sold";
  }

  function discountPercent(item) {
    const fromSheet = String(item.discount || "").match(/\d+(?:\.\d+)?/);

    if (fromSheet) return Number(fromSheet[0]) || 0;

    const value = Number(item.itemValue || 0);
    const sale = Number(item.salePrice || 0);

    if (value > 0 && sale >= 0 && sale < value) {
      return ((value - sale) / value) * 100;
    }

    return 0;
  }

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function isNew(item) {
    const date = parseDate(item.dateAdded);
    if (!date) return false;

    const diff = Date.now() - date.getTime();
    return diff >= 0 && diff <= 30 * 86400000;
  }

  function iconFor(category) {
    const text = String(category || "").toLowerCase();

    for (const [keywords, icon] of iconRules) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return icon;
      }
    }

    return "🛍️";
  }

  function categoryUrl(category) {
    return `../index.html?category=${encodeURIComponent(category)}#products`;
  }

  function categoryDescription(category) {
    const text = String(category || "").toLowerCase();

    if (text.includes("card")) return "Trading cards, collector items, packs, singles, and card supplies.";
    if (text.includes("game")) return "Gaming products, accessories, collectibles, and entertainment items.";
    if (text.includes("electronic")) return "Technology, electronics, computer items, and useful gadgets.";
    if (text.includes("collect")) return "Figures, memorabilia, display pieces, and collectible finds.";
    if (text.includes("book")) return "Books, media, guides, movies, and other entertainment finds.";
    if (text.includes("clothing")) return "Clothing, accessories, shoes, and personal style finds.";
    if (text.includes("home")) return "Household, decor, organization, and home-use items.";

    return "Browse available Bow Marketplace listings in this category.";
  }

  function buildCategories(items) {
    const map = new Map();

    items
      .filter(item => !isSold(item))
      .forEach(item => {
        const name = item.category || "Uncategorized";

        if (!map.has(name)) {
          map.set(name, {
            name,
            items: [],
            deals: 0,
            newItems: 0,
            image: "",
            latestName: "",
            latestDate: null
          });
        }

        const category = map.get(name);
        category.items.push(item);

        if (discountPercent(item) > 0) category.deals += 1;
        if (isNew(item)) category.newItems += 1;
        if (!category.image && item.images?.[0]) category.image = item.images[0];

        const date = parseDate(item.dateAdded) || parseDate(item.lastUpdated);

        if (date && (!category.latestDate || date > category.latestDate)) {
          category.latestDate = date;
          category.latestName = item.name;
        }
      });

    return [...map.values()].map(category => ({
      ...category,
      count: category.items.length,
      icon: iconFor(category.name)
    }));
  }

  function filteredCategories() {
    let categories = state.categories.filter(category =>
      category.name.toLowerCase().includes(state.search.toLowerCase())
    );

    categories.sort((a, b) => {
      if (state.sort === "name") {
        return a.name.localeCompare(b.name);
      }

      if (state.sort === "deals") {
        return b.deals - a.deals || b.count - a.count;
      }

      if (state.sort === "new") {
        return b.newItems - a.newItems || b.count - a.count;
      }

      return b.count - a.count || a.name.localeCompare(b.name);
    });

    return categories;
  }

  function renderStats() {
    const availableItems = state.categories.reduce((sum, category) => sum + category.count, 0);
    const deals = state.categories.reduce((sum, category) => sum + category.deals, 0);
    const newItems = state.categories.reduce((sum, category) => sum + category.newItems, 0);

    $("categoryStatTotal").textContent = state.categories.length;
    $("categoryStatItems").textContent = availableItems;
    $("categoryStatDeals").textContent = deals;
    $("categoryStatNew").textContent = newItems;
  }

  function popularCard(category) {
    return `
      <a class="popular-card" href="${categoryUrl(category.name)}">
        <div class="popular-icon">${category.icon}</div>

        <div class="popular-content">
          <h3>${U.escape(category.name)}</h3>
          <span>
            ${category.count} item${category.count === 1 ? "" : "s"} •
            ${category.deals} deal${category.deals === 1 ? "" : "s"}
          </span>
        </div>
      </a>
    `;
  }

  function categoryCard(category) {
    const badge = category.deals > 0
      ? `${category.deals} DEAL${category.deals === 1 ? "" : "S"}`
      : category.newItems > 0
        ? `${category.newItems} NEW`
        : "BROWSE";

    return `
      <article class="category-card">
        <span class="category-badge">${badge}</span>

        <div class="category-image">
          ${
            category.image
              ? `<img
                   src="${U.escape(category.image)}"
                   alt="${U.escape(category.name)}"
                   onerror="this.style.display='none';this.nextElementSibling.style.display='block'"
                 >
                 <span class="category-icon-large" style="display:none">${category.icon}</span>`
              : `<span class="category-icon-large">${category.icon}</span>`
          }
        </div>

        <div class="category-body">
          <h3>${U.escape(category.name)}</h3>

          <p>${U.escape(categoryDescription(category.name))}</p>

          <div class="category-metrics">
            <div class="category-metric">
              <strong>${category.count}</strong>
              <span>ITEMS</span>
            </div>

            <div class="category-metric">
              <strong>${category.deals}</strong>
              <span>DEALS</span>
            </div>

            <div class="category-metric">
              <strong>${category.newItems}</strong>
              <span>NEW</span>
            </div>
          </div>

          <div class="category-latest">
            <strong>Newest listing:</strong><br>
            ${U.escape(category.latestName || "No recent listing")}
          </div>

          <a class="category-open" href="${categoryUrl(category.name)}">
            Browse ${U.escape(category.name)}
          </a>
        </div>
      </article>
    `;
  }

  function render() {
    const categories = filteredCategories();

    $("categoryCount").textContent =
      `${categories.length} categor${categories.length === 1 ? "y" : "ies"} shown`;

    $("categoryPageGrid").innerHTML = categories.length
      ? categories.map(categoryCard).join("")
      : `
        <div class="category-empty">
          <h3>No categories found</h3>
          <p>Try another search.</p>
        </div>
      `;

    const popular = [...state.categories]
      .sort((a, b) => b.count - a.count || b.deals - a.deals)
      .slice(0, 3);

    $("popularCategoryGrid").innerHTML = popular.length
      ? popular.map(popularCard).join("")
      : `
        <div class="category-empty">
          <h3>No categories available</h3>
        </div>
      `;
  }

  async function init() {
    $("categoryPageGrid").innerHTML =
      '<div class="category-empty"><h3>Loading categories...</h3></div>';

    try {
      await S.fetchItems();

      state.categories = buildCategories(S.items);
      renderStats();
      render();
    } catch (error) {
      console.error("Categories could not load:", error);

      $("categoryCount").textContent = "Categories unavailable";
      $("categoryPageGrid").innerHTML = `
        <div class="category-empty">
          <h3>Categories could not load</h3>
          <p>Please check the Google Sheet and its sharing settings.</p>
        </div>
      `;
    }
  }

  $("categorySearch").addEventListener("input", event => {
    state.search = event.target.value.trim();
    render();
  });

  $("categorySort").addEventListener("change", event => {
    state.sort = event.target.value;
    render();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
