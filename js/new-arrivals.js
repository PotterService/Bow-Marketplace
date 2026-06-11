(function () {
  'use strict';

  async function renderNewArrivals() {
    const grid = document.getElementById('newArrivalsGrid');
    const count = document.getElementById('arrivalCount');
    const showSold = document.getElementById('showSoldArrivals')?.checked || false;
    if (!grid || !window.BowMarketplaceExtra) return;

    grid.innerHTML = '<div class="loading">Loading new arrivals...</div>';

    try {
      const tools = window.BowMarketplaceExtra;
      const items = await tools.loadItems();
      const arrivals = items
        .filter(item => showSold || !tools.isSold(item))
        .filter(item => tools.isNewArrival(item))
        .sort((a, b) => {
          const ad = tools.parseDate(a['Date Added']);
          const bd = tools.parseDate(b['Date Added']);
          const orderedScore = Number(tools.isOrdered(b)) - Number(tools.isOrdered(a));
          if (orderedScore) return orderedScore;
          return (bd ? bd.getTime() : 0) - (ad ? ad.getTime() : 0);
        });

      count.textContent = `${arrivals.length} new arrivals${showSold ? ' including sold' : ''}`;

      if (!arrivals.length) {
        grid.innerHTML = '<div class="empty-state"><h3>No new arrivals yet</h3><p>Items added in the last 30 days or marked Ordered/Processing will appear here. Sold items are hidden unless you check Show sold items.</p></div>';
        return;
      }

      grid.innerHTML = arrivals.map(item => tools.card(item, { showDiscount: true })).join('');
    } catch (err) {
      console.error(err);
      if (count) count.textContent = 'Could not load';
      grid.innerHTML = '<div class="empty-state"><h3>New arrivals could not load</h3><p>Please check your Google Sheet share settings.</p></div>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('showSoldArrivals')?.addEventListener('change', renderNewArrivals);
      renderNewArrivals();
    });
  } else {
    document.getElementById('showSoldArrivals')?.addEventListener('change', renderNewArrivals);
    renderNewArrivals();
  }
})();
