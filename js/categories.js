document.addEventListener("DOMContentLoaded", async () => {
  const box = document.getElementById("categoryPageGrid");
  try {
    await BowStore.fetchItems();
    const U = BowUtils;
    const isSold = (item) => String(item?.availableStatus ?? item?.raw?.["Available"] ?? "").trim().toLowerCase() === "sold";
    const categories = [...new Set(BowStore.items.filter(x => !isSold(x)).map(x => x.category).filter(Boolean))].sort();

    box.innerHTML = categories.length ? categories.map(cat => {
      const count = BowStore.items.filter(item => item.category === cat && !isSold(item)).length;
      return `<button class="category-page-card" data-category="${U.escape(cat)}">
        <strong>${U.escape(cat)}</strong>
        <span>${count} current listings</span>
      </button>`;
    }).join("") : "<section class='empty-state'><h2>No categories found</h2></section>";

    box.querySelectorAll("[data-category]").forEach(btn => {
      btn.addEventListener("click", () => {
        const cat = btn.dataset.category;
        localStorage.setItem("bow_selected_category", cat);
        window.location.href = "../index.html?category=" + encodeURIComponent(cat) + "#products";
      });
    });
  } catch (err) {
    box.innerHTML = "<section class='empty-state'><h2>Categories unavailable</h2></section>";
  }
});
