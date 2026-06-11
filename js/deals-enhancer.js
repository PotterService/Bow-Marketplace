(function () {
  'use strict';

  async function renderDeals() {
    const grid = document.getElementById('dealsGrid');
    if (!grid || !window.BowMarketplaceExtra) return;

    grid.innerHTML = '<div class="loading">Loading biggest deals...</div>';

    try {
      const tools = window.BowMarketplaceExtra;
      const items = await tools.loadItems();
      const deals = items
        .filter(item => !tools.isSold(item))
        .map(item => ({ item, discount: tools.discountPercent(item) }))
        .filter(x => x.discount > 0)
        .sort((a, b) => b.discount - a.discount || String(a.item['Item Name'] || '').localeCompare(String(b.item['Item Name'] || '')));

      if (!deals.length) {
        grid.innerHTML = '<div class="empty-state"><h3>No deals found</h3><p>Add a sale price and discount to show items here.</p></div>';
        return;
      }

      grid.innerHTML = deals.map(x => tools.card(x.item, { showDiscount: true })).join('');
    } catch (err) {
      console.error(err);
      grid.innerHTML = '<div class="empty-state"><h3>Deals could not load</h3><p>Please check your sheet share settings.</p></div>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderDeals);
  } else {
    renderDeals();
  }
})();
