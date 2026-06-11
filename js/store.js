window.BowStore = {
  items: [],
  cart: JSON.parse(localStorage.getItem("bow_cart") || "[]"),
  wishlist: JSON.parse(localStorage.getItem("bow_wishlist") || "[]"),

  async fetchItems() {
    const cfg = window.STORE_CONFIG;
    const rows = await this.loadSheetRows(cfg);
    this.items = rows.map((row, index) => this.normalize(row, index)).filter(item => item.name);
    return this.items;
  },

  async loadSheetRows(cfg) {
    const sheetId = encodeURIComponent(cfg.sheetId);
    const sheetName = encodeURIComponent(cfg.sheetName);
    const urls = [
      `https://opensheet.elk.sh/${sheetId}/${sheetName}`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`
    ];

    let lastError = null;

    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`Sheet fetch failed: ${response.status}`);

        const text = await response.text();
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json") || text.trim().startsWith("[")) {
          return JSON.parse(text);
        }

        return this.csvToObjects(text);
      } catch (err) {
        console.warn("BowStore sheet source failed, trying fallback:", url, err);
        lastError = err;
      }
    }

    throw lastError || new Error("Unable to load Google Sheet data.");
  },

  csvToObjects(csvText) {
    const rows = this.parseCSV(csvText);
    if (!rows.length) return [];
    const headers = rows[0].map(h => String(h || "").trim());
    return rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || "";
      });
      return obj;
    });
  },

  parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") i++;
        row.push(cell);
        if (row.some(v => String(v).trim() !== "")) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }

    row.push(cell);
    if (row.some(v => String(v).trim() !== "")) rows.push(row);
    return rows;
  },

  normalize(row, index) {
    const U = window.BowUtils;
    const F = (name) => U.field(row, name);

    const salePriceRaw = U.text(F("Sale Price"));
    const itemValueRaw = U.text(F("Item Value"));
    const price = U.number(salePriceRaw || itemValueRaw);
    const itemValue = U.number(itemValueRaw);
    const images = U.splitImages(F("Image URLs"));
    const id = U.text(F("Item ID")) || U.text(F("Internal Code")) || `item-${index + 1}`;
    const availableStatus = U.text(F("Available"));
    const isSold = availableStatus.trim().toLowerCase() === "sold";

    return {
      raw: row,
      id,
      itemId: U.text(F("Item ID")),
      name: U.text(F("Item Name")),
      category: U.text(F("Category")) || "Uncategorized",
      itemValue,
      description: U.text(F("Description")),
      salePrice: price,
      salePriceRaw,
      internalCode: U.text(F("Internal Code")),
      available: !isSold,
      availableStatus,
      images,
      amazonLink: U.text(F("Amazon Link")),
      dateAdded: U.text(F("Date Added")),
      lastUpdated: U.text(F("Last Updated")),
      notes: U.text(F("Notes")),
      discount: U.text(F("Discount")),
      onEbay: U.truthy(F("On Ebay")),
      ebayLink: U.text(F("Ebay Link")),
      az: U.text(F("Az") || F("AZ")),
      searchText: Object.values(row).join(" ").toLowerCase()
    };
  },

  save() {
    localStorage.setItem("bow_cart", JSON.stringify(this.cart));
    localStorage.setItem("bow_wishlist", JSON.stringify(this.wishlist));
  },

  addToCart(id) {
    const found = this.cart.find(x => x.id === id);
    if (found) found.qty += 1;
    else this.cart.push({ id, qty: 1 });
    this.save();
  },

  removeFromCart(id) {
    this.cart = this.cart.filter(x => x.id !== id);
    this.save();
  },

  toggleWishlist(id) {
    if (this.wishlist.includes(id)) this.wishlist = this.wishlist.filter(x => x !== id);
    else this.wishlist.push(id);
    this.save();
  },

  itemById(id) {
    return this.items.find(x => x.id === id);
  }
};
