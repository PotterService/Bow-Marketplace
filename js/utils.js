window.BowUtils = {
  money(value) {
    const num = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(num)) return "$0.00";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: window.STORE_CONFIG?.currency || "USD" }).format(num);
  },

  priceText(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "Contact for pricing";
    const num = Number(raw.replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(num) || num <= 0) return "Contact for pricing";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: window.STORE_CONFIG?.currency || "USD" }).format(num);
  },

  number(value) {
    const num = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(num) ? num : 0;
  },

  text(value) {
    return String(value ?? "").trim();
  },

  field(row, name) {
    if (!row) return "";
    const wanted = String(name || "").trim().toLowerCase();
    const key = Object.keys(row).find(k => String(k).trim().toLowerCase() === wanted);
    return key ? row[key] : "";
  },

  escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  },

  truthy(value) {
    const v = String(value ?? "").trim().toLowerCase();
    return ["yes", "true", "y", "1", "available", "in stock", "on"].includes(v);
  },

  splitImages(value) {
    return String(value ?? "")
      .split(/[,;\n]+/)
      .map(v => v.trim())
      .filter(Boolean);
  },

  slug(value) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  },

  toast(message) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2600);
  }
};
