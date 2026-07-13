(() => {
  const $ = id => document.getElementById(id);

  const state = {
    items: [],
    range: "30",
    showSold: false,
    search: "",
    tab: "all"
  };

  const field = (item, names, fallback = "") => {
    for (const name of names) {
      if (item && item[name] !== undefined && item[name] !== null && String(item[name]).trim() !== "") {
        return item[name];
      }
    }
    return fallback;
  };

  const statusOf = item =>
    String(field(item, ["Available", "Status", "status", "availability"], "Available")).trim();

  const nameOf = item =>
    field(item, ["Item Name", "itemName", "name", "title"], "Untitled Item");

  const descriptionOf = item =>
    field(item, ["Description", "description", "details"], "No description added yet.");

  const categoryOf = item =>
    field(item, ["Category", "category"], "Other");

  const salePriceOf = item =>
    Number(field(item, ["Sale Price", "salePrice", "price"], 0)) || 0;

  const itemValueOf = item =>
    Number(field(item, ["Item Value", "itemValue", "originalPrice", "value"], 0)) || 0;

  const dateAddedOf = item =>
    field(item, ["Date Added", "dateAdded", "createdAt", "added"], "");

  const lastUpdatedOf = item =>
    field(item, ["Last Updated", "lastUpdated", "updatedAt", "modifiedAt"], "");

  const itemIdOf = item =>
    field(item, ["Item ID", "itemId", "id"], "");

  const imageOf = item => {
    const direct = field(item, ["Image URL", "imageUrl", "image", "photo"], "");
    if (direct) return String(direct).split(",")[0].trim();

    const urls = field(item, ["Image URLs", "imageUrls", "images"], "");
    if (Array.isArray(urls)) return urls[0] || "";
    return String(urls || "").split(",")[0].trim();
  };

  const money = amount =>
    Number(amount || 0).toLocaleString(undefined, {
      style: "currency",
      currency: "USD"
    });

  const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));

  const parseDate = value => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const withinDays = (value, days) => {
    if (days === "all") return true;
    const date = parseDate(value);
    if (!date) return false;
    const now = new Date();
    const diff = now - date;
    return diff >= 0 && diff <= Number(days) * 86400000;
  };

  const relativeDate = value => {
    const date = parseDate(value);
    if (!date) return "Not listed";

    const today = new Date();
    const diffDays = Math.floor((today - date) / 86400000);

    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  const isSold = item => /sold/i.test(statusOf(item));
  const isOrdered = item => /ordered/i.test(statusOf(item));
  const isProcessing = item => /processing/i.test(statusOf(item));

  async function loadItems() {
    let items = [];

    try {
      if (window.BOW_STORE?.getProducts) {
        items = await window.BOW_STORE.getProducts();
      } else if (window.store?.getProducts) {
        items = await window.store.getProducts();
      } else if (typeof window.getProducts === "function") {
        items = await window.getProducts();
      } else if (typeof window.loadProducts === "function") {
        items = await window.loadProducts();
      } else if (Array.isArray(window.marketplaceItems)) {
        items = window.marketplaceItems;
      } else if (Array.isArray(window.PRODUCTS)) {
        items = window.PRODUCTS;
      } else if (Array.isArray(window.products)) {
        items = window.products;
      }
    } catch (error) {
      console.error("Could not load marketplace items:", error);
    }

    if (!Array.isArray(items)) {
      items = items?.items || items?.products || items?.data || [];
    }

    if (!Array.isArray(items) || !items.length) {
      try {
        const possibleKeys = [
          "bowMarketplaceItems",
          "marketplaceItems",
          "products",
          "inventory"
        ];

        for (const key of possibleKeys) {
          const raw = localStorage.getItem(key);
          if (!raw) continue;

          const parsed = JSON.parse(raw);
          const list = Array.isArray(parsed)
            ? parsed
            : parsed?.items || parsed?.products || [];

          if (Array.isArray(list) && list.length) {
            items = list;
            break;
          }
        }
      } catch (error) {
        console.warn("No local marketplace data found.", error);
      }
    }

    state.items = Array.isArray(items) ? items : [];
    render();
  }

  function matchesSearch(item) {
    if (!state.search) return true;
    return JSON.stringify(item).toLowerCase().includes(state.search.toLowerCase());
  }

  function visibleItems() {
    return state.items.filter(item => {
      if (!state.showSold && isSold(item)) return false;
      return matchesSearch(item);
    });
  }

  function lists() {
    const items = visibleItems();

    const newlyAdded = items
      .filter(item => withinDays(dateAddedOf(item), state.range))
      .sort((a, b) => (parseDate(dateAddedOf(b)) || 0) - (parseDate(dateAddedOf(a)) || 0));

    const recentlyUpdated = items
      .filter(item => withinDays(lastUpdatedOf(item), state.range))
      .filter(item => {
        const added = parseDate(dateAddedOf(item));
        const updated = parseDate(lastUpdatedOf(item));
        return updated && (!added || updated.getTime() !== added.getTime());
      })
      .sort((a, b) => (parseDate(lastUpdatedOf(b)) || 0) - (parseDate(lastUpdatedOf(a)) || 0));

    const ordered = items.filter(isOrdered);
    const processing = items.filter(isProcessing);

    return { newlyAdded, recentlyUpdated, ordered, processing };
  }

  function ribbon(item, type) {
    if (isSold(item)) return '<span class="arrival-ribbon sold">SOLD</span>';
    if (type === "new") return '<span class="arrival-ribbon">NEW</span>';
    if (type === "updated") return '<span class="arrival-ribbon updated">UPDATED</span>';
    if (type === "ordered") return '<span class="arrival-ribbon ordered">ORDERED</span>';
    if (type === "processing") return '<span class="arrival-ribbon processing">PROCESSING</span>';
    return "";
  }

  function itemLink(item) {
    const id = encodeURIComponent(itemIdOf(item));
    return id ? `product.html?id=${id}` : "#";
  }

  function card(item, type) {
    const image = imageOf(item);
    const salePrice = salePriceOf(item);
    const itemValue = itemValueOf(item);
    const discount = itemValue > salePrice && salePrice > 0;

    return `
      <article class="arrival-card">
        <div class="arrival-image">
          ${ribbon(item, type)}
          ${image
            ? `<img src="${esc(image)}" alt="${esc(nameOf(item))}" onerror="this.style.display='none'">`
            : '<div class="arrival-placeholder">No Image</div>'
          }
        </div>

        <div class="arrival-card-body">
          <h3>${esc(nameOf(item))}</h3>
          <p class="arrival-description">${esc(descriptionOf(item))}</p>

          <div class="arrival-meta">
            <span><strong>Category:</strong> ${esc(categoryOf(item))}</span>
            <span><strong>Added:</strong> ${esc(relativeDate(dateAddedOf(item)))}</span>
            <span><strong>Updated:</strong> ${esc(relativeDate(lastUpdatedOf(item)))}</span>
            <span><strong>Status:</strong> ${esc(statusOf(item))}</span>
          </div>

          <div class="arrival-price">
            <strong>${money(salePrice)}</strong>
            ${discount ? `<span class="arrival-old-price">${money(itemValue)}</span>` : ""}
          </div>

          <div class="arrival-actions">
            <a class="arrival-view" href="${esc(itemLink(item))}">View Details</a>
            <button class="arrival-wish" type="button" data-wishlist="${esc(itemIdOf(item))}">♡ Wishlist</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderGrid(id, items, type) {
    const grid = $(id);

    if (!items.length) {
      grid.innerHTML = `
        <div class="arrival-empty">
          <h3>No matching items</h3>
          <p>Try changing the date range, search, or sold-item setting.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(item => card(item, type)).join("");
  }

  function updateSectionVisibility() {
    const map = {
      all: ["newSection", "updatedSection", "orderedSection", "processingSection"],
      new: ["newSection"],
      updated: ["updatedSection"],
      ordered: ["orderedSection"],
      processing: ["processingSection"]
    };

    const visible = map[state.tab] || map.all;

    ["newSection", "updatedSection", "orderedSection", "processingSection"]
      .forEach(id => $(id).classList.toggle("hidden", !visible.includes(id)));
  }

  function render() {
    const { newlyAdded, recentlyUpdated, ordered, processing } = lists();

    $("statNew").textContent = newlyAdded.length;
    $("statUpdated").textContent = recentlyUpdated.length;
    $("statOrdered").textContent = ordered.length;
    $("statProcessing").textContent = processing.length;

    $("newCount").textContent = `${newlyAdded.length} item${newlyAdded.length === 1 ? "" : "s"}`;
    $("updatedCount").textContent = `${recentlyUpdated.length} item${recentlyUpdated.length === 1 ? "" : "s"}`;
    $("orderedCount").textContent = `${ordered.length} item${ordered.length === 1 ? "" : "s"}`;
    $("processingCount").textContent = `${processing.length} item${processing.length === 1 ? "" : "s"}`;

    renderGrid("newArrivalsGrid", newlyAdded, "new");
    renderGrid("updatedArrivalsGrid", recentlyUpdated, "updated");
    renderGrid("orderedArrivalsGrid", ordered, "ordered");
    renderGrid("processingArrivalsGrid", processing, "processing");

    updateSectionVisibility();

    document.querySelectorAll("[data-wishlist]").forEach(button => {
      button.addEventListener("click", () => {
        const id = button.dataset.wishlist;

        if (typeof window.addToWishlist === "function") {
          window.addToWishlist(id);
        } else {
          const saved = JSON.parse(localStorage.getItem("bowWishlist") || "[]");
          if (!saved.includes(id)) saved.push(id);
          localStorage.setItem("bowWishlist", JSON.stringify(saved));
        }

        button.textContent = "♥ Saved";
      });
    });
  }

  $("arrivalSearch").addEventListener("input", event => {
    state.search = event.target.value.trim();
    render();
  });

  $("arrivalRange").addEventListener("change", event => {
    state.range = event.target.value;
    render();
  });

  $("showSoldArrivals").addEventListener("change", event => {
    state.showSold = event.target.checked;
    render();
  });

  document.querySelectorAll(".arrival-tab").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".arrival-tab").forEach(tab => tab.classList.remove("active"));
      button.classList.add("active");
      state.tab = button.dataset.tab;
      updateSectionVisibility();
    });
  });

  loadItems();
})();
