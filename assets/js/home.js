/* Home / shop page */
(function () {
  'use strict';
  const B = window.Bow, { $, esc, money } = B;
  const PAGE = 48;
  const params = new URLSearchParams(location.search);
  const state = {
    q: params.get('q') || '',
    category: params.get('category') || '',
    sort: params.get('sort') || 'featured',
    max: params.get('max') || '',
    deals: params.get('deals') === '1',
    photo: params.get('photo') === '1',
    sold: B.SHOW_AVAIL && params.get('sold') === '1',
    limit: PAGE,
  };
  let items = [];

  document.addEventListener('DOMContentLoaded', async () => {
    const biz = B.BIZ, place = B.place;
    if (place) $('#heroPlace').textContent = '📍 ' + place;
    $('#heroLead').textContent = `${B.CFG.storeName} is a local marketplace operated by ${biz.operator || 'Bow Service'}${place ? ' in ' + place : ''}. Browse hundreds of items, all priced below Amazon.`;
    $('#grid').innerHTML = B.skeleton(8);
    $('#dealRail').innerHTML = $('#newRail').innerHTML = B.skeleton(5);
    syncControls();
    bind();
    try {
      items = await B.getItems();
    } catch (e) {
      console.error(e);
      $('#grid').innerHTML = B.errorHtml();
      $('#dealRail').innerHTML = $('#newRail').innerHTML = '';
      $('#resultText').textContent = '';
      return;
    }
    if (state.category && isAdultCat(state.category) && !(await B.confirmAdult())) state.category = '';
    renderNumbers(); renderCollage(); renderRails(); renderCats(); renderChips(); render();
    if (location.hash === '#shop' || state.q || state.category) $('#shop').scrollIntoView();
  });

  const pub = () => items.filter((i) => !i.isAdult && (B.SHOW_AVAIL ? !i.sold : true));
  const isAdultCat = (name) => items.some((i) => i.isAdult && i.category === name) ||
    (B.CFG.adultCategories || []).some((c) => B.lower(c) === B.lower(name));

  function bind() {
    $('#fSort').addEventListener('input', (e) => { state.sort = e.target.value; reset(); });
    $('#fMax').addEventListener('input', (e) => { state.max = e.target.value; reset(); });
    $('#fDeals').addEventListener('change', (e) => { state.deals = e.target.checked; reset(); });
    $('#fPhoto').addEventListener('change', (e) => { state.photo = e.target.checked; reset(); });
    $('#loadMore').addEventListener('click', () => { state.limit += PAGE; render(); });
    const pickCat = async (name) => {
      if (name && isAdultCat(name) && !(await B.confirmAdult())) return;
      state.category = state.category === name ? '' : name;
      renderChips(); reset();
      $('#shop').scrollIntoView({ behavior: 'smooth' });
    };
    $('#chips').addEventListener('click', (e) => { const c = e.target.closest('[data-cat]'); if (c) pickCat(c.dataset.cat); });
    $('#heroCats').addEventListener('click', (e) => { const c = e.target.closest('[data-cat]'); if (c) { e.preventDefault(); state.category = ''; pickCat(c.dataset.cat); } });
    $('#activeFilters').addEventListener('click', (e) => {
      const b = e.target.closest('[data-clear]'); if (!b) return;
      const k = b.dataset.clear;
      if (k === 'all') clearAll();
      else { state[k] = typeof state[k] === 'boolean' ? false : ''; syncControls(); renderChips(); reset(); }
      if (k === 'q' || k === 'all') { const s = document.querySelector('.search input'); if (s) s.value = ''; }
    });
    $('#heroSearch').addEventListener('submit', (e) => { e.preventDefault(); search(e.target.q.value); });
    window.BowHomeSearch = search;
  }
  function search(q) { state.q = String(q || '').trim(); reset(); $('#shop').scrollIntoView({ behavior: 'smooth' }); }

  function syncControls() {
    $('#fSort').value = state.sort; $('#fMax').value = state.max;
    $('#fDeals').checked = state.deals; $('#fPhoto').checked = state.photo;
  }
  function reset() { state.limit = PAGE; render(); saveUrl(); }
  function clearAll() {
    Object.assign(state, { q: '', category: '', max: '', deals: false, photo: false, sold: false, sort: 'featured' });
    syncControls(); renderChips(); reset();
  }
  function saveUrl() {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.category) p.set('category', state.category);
    if (state.sort !== 'featured') p.set('sort', state.sort);
    if (state.max) p.set('max', state.max);
    if (state.deals) p.set('deals', '1');
    if (state.photo) p.set('photo', '1');
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '') + '#shop');
  }

  // ---------- top sections ----------
  function renderNumbers() {
    const list = pub();
    const discounted = list.filter((i) => i.discount > 0);
    $('#nItems').textContent = list.length.toLocaleString();
    $('#nCats').textContent = new Set(list.map((i) => i.category)).size;
    $('#nAvg').textContent = discounted.length ? Math.round(discounted.reduce((s, i) => s + i.discount, 0) / discounted.length) + '%' : '–';
    $('#nBig').textContent = list.filter((i) => i.discount >= 50).length.toLocaleString();
  }
  function renderCollage() {
    // Four eye-catching items with photos: big discounts, spread across categories.
    const seen = new Set(), picks = [];
    for (const i of [...pub()].filter((i) => i.images.length && i.discount >= 40).sort((a, b) => b.savings - a.savings)) {
      if (seen.has(i.category)) continue;
      seen.add(i.category); picks.push(i);
      if (picks.length === 4) break;
    }
    $('#collage').querySelectorAll('.polaroid').forEach((el, n) => {
      const i = picks[n];
      if (!i) { el.remove(); return; }
      el.innerHTML = `<img src="${esc(i.images[0])}" alt="" loading="eager"><span class="sticker">−${i.discount}%</span><span class="cap">${money(i.price)}</span>`;
    });
  }
  function renderRails() {
    const pool = pub().filter((i) => i.images.length);
    const deals = [...pool].filter((i) => i.discount > 0).sort((a, b) => b.discount - a.discount || b.savings - a.savings).slice(0, 12);
    const fresh = [...pool].filter((i) => i.added).sort((a, b) => b.added - a.added || b.index - a.index).slice(0, 12);
    $('#dealRail').innerHTML = deals.map(B.card).join('');
    $('#newRail').innerHTML = fresh.map(B.card).join('');
    $('#dealsSection').hidden = !deals.length;
    $('#newSection').hidden = !fresh.length;
  }
  function catGroups() {
    const g = new Map();
    for (const i of pub()) { const x = g.get(i.category) || { name: i.category, n: 0, img: '' }; x.n++; if (!x.img && i.images.length) x.img = i.images[0]; g.set(i.category, x); }
    return [...g.values()].sort((a, b) => b.n - a.n);
  }
  function renderCats() {
    const groups = catGroups();
    $('#catRow').innerHTML = groups.slice(0, 8).map((c) => `<a class="cat-tile" href="${B.categoryUrl(c.name)}">
        <span class="cat-img">${c.img ? `<img src="${esc(c.img)}" alt="" loading="lazy">` : ''}</span>
        <span class="cat-name">${esc(c.name)}</span><span class="cat-n">${c.n} items</span></a>`).join('');
    $('#heroCats').innerHTML = '<span>Popular:</span>' + groups.slice(0, 5).map((c) => `<a href="${B.categoryUrl(c.name)}" data-cat="${esc(c.name)}">${esc(c.name)}</a>`).join('');
  }

  // ---------- shop ----------
  function renderChips() {
    const counts = new Map();
    for (const i of items) if (!i.sold || state.sold) counts.set(i.category, (counts.get(i.category) || 0) + 1);
    const cats = [...counts.entries()].filter(([name]) => name !== state.category).sort((a, b) => b[1] - a[1]).slice(0, 16);
    if (state.category) cats.unshift([state.category, counts.get(state.category) || 0]);
    $('#chips').innerHTML = `<button class="chip ${state.category ? '' : 'on'}" data-cat="">All</button>` +
      cats.map(([name, n]) => `<button class="chip ${state.category === name ? 'on' : ''}" data-cat="${esc(name)}">${isAdultCat(name) ? '🔞 ' : ''}${esc(name)}<span class="n">${n}</span></button>`).join('') +
      `<a class="chip ghost" href="pages/categories.html">More…</a>`;
  }

  function filtered() {
    const q = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    const max = Number(state.max) || 0;
    const list = items.filter((i) => {
      if (i.sold && !state.sold) return false;
      if (i.isAdult && !(state.category === i.category && B.adultOk())) return false;
      if (state.category && i.category !== state.category) return false;
      if (q.length && !q.every((w) => i.search.includes(w))) return false;
      if (max && i.price > max) return false;
      if (state.deals && !i.discount) return false;
      if (state.photo && !i.images.length) return false;
      return true;
    });
    const by = {
      // Featured: items with photos first, then biggest savings.
      featured: (a, b) => ((b.images.length > 0) - (a.images.length > 0)) || (b.savings - a.savings) || a.name.localeCompare(b.name),
      newest: (a, b) => ((b.added?.getTime() || 0) - (a.added?.getTime() || 0)) || b.index - a.index,
      discount: (a, b) => b.discount - a.discount || b.savings - a.savings,
      priceLow: (a, b) => (a.price || Infinity) - (b.price || Infinity),
      priceHigh: (a, b) => b.price - a.price,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return list.sort(by[state.sort] || by.featured);
  }

  function render() {
    const list = filtered();
    const shown = list.slice(0, state.limit);
    $('#grid').innerHTML = shown.length ? shown.map(B.card).join('')
      : '<div class="empty"><div class="empty-icon">🔍</div><h3>No items match</h3><p>Try a different search, or clear your filters.</p><button class="btn btn-dark" id="emptyClear">Clear filters</button></div>';
    $('#emptyClear')?.addEventListener('click', () => { clearAll(); const s = document.querySelector('.search input'); if (s) s.value = ''; });
    $('#resultText').innerHTML = `Showing <b>${shown.length.toLocaleString()}</b> of <b>${list.length.toLocaleString()}</b> item${list.length === 1 ? '' : 's'}`;
    $('#loadMore').hidden = shown.length >= list.length;
    $('#loadMore').textContent = `Show more (${(list.length - shown.length).toLocaleString()} more items)`;
    const chips = [];
    if (state.q) chips.push(['q', `“${state.q}”`]);
    if (state.category) chips.push(['category', state.category]);
    if (state.max) chips.push(['max', `Under ${money(state.max)}`]);
    if (state.deals) chips.push(['deals', 'Deals only']);
    if (state.photo) chips.push(['photo', 'Has photo']);
    $('#activeFilters').innerHTML = chips.map(([k, label]) => `<button data-clear="${k}" title="Remove filter">${esc(label)} ✕</button>`).join('') +
      (chips.length > 1 ? '<button data-clear="all">Clear all</button>' : '');
  }
})();
