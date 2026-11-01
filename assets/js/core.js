/* Bow Service Marketplace: shared code for every page (data, header/footer, product cards, wishlist). */
(function () {
  'use strict';
  const CFG = window.STORE_CONFIG || {};

  // Pages in /pages/ need "../" to reach the site root; work it out from this script's own URL.
  const scriptSrc = document.currentScript ? document.currentScript.src : '';
  const ROOT = scriptSrc ? scriptSrc.replace(/assets\/js\/core\.js.*$/, '') : './';
  const url = (path) => ROOT + path;
  const NO_IMAGE = url('assets/placeholders/no-image.svg');

  // ---------- small helpers ----------
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (v) => { const n = Number(String(v ?? '').replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? n : 0; };
  const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: CFG.currency || 'USD' }).format(Number(n) || 0);
  const moneyShort = (n) => (Number(n) % 1 === 0 ? '$' + Number(n).toLocaleString('en-US') : money(n));
  const field = (row, name) => {
    const want = name.toLowerCase();
    const k = Object.keys(row).find((key) => key.trim().toLowerCase() === want);
    return k ? String(row[k] ?? '').trim() : '';
  };
  const parseDate = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d; };
  const lower = (s) => String(s || '').trim().toLowerCase();
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // ---------- categories ----------
  const aliasMap = Object.fromEntries(Object.entries(CFG.categoryAliases || {}).map(([k, v]) => [lower(k), v]));
  const hidden = new Set((CFG.hiddenCategories || []).map(lower));
  const adult = new Set((CFG.adultCategories || ['Adult']).map(lower));
  const niceCase = (s) => (s.length > 3 && s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s);
  function categoryKey(raw) {
    const t = String(raw || '').replace(/\s+/g, ' ').trim();
    const aliased = aliasMap[lower(t)] ?? t;
    return { key: lower(aliased) || 'other', name: niceCase(aliased) || 'Other' };
  }

  // ---------- status ----------
  // While showAvailability is false, every item is just "listed": no sold / on order / available states.
  const SHOW_AVAIL = CFG.showAvailability === true;
  function statusInfo(raw) {
    if (!SHOW_AVAIL) return { key: '', label: '', tone: '', note: '' };
    const s = lower(raw) || 'available';
    const known = (CFG.statusLabels || {})[s];
    return { key: s, label: known?.label || raw || 'Available', tone: known?.tone || 'info', note: known?.note || '' };
  }

  // ---------- data ----------
  const CACHE_KEY = 'bow_inventory_v3';
  const CACHE_MS = 2 * 60 * 1000;
  let itemsPromise = null;

  async function loadRows() {
    try {
      const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (c && Date.now() - c.at < CACHE_MS && Array.isArray(c.rows)) return c.rows;
    } catch {}
    const id = encodeURIComponent(CFG.sheetId), sheet = encodeURIComponent(CFG.sheetName || 'Inventory');
    // 1st: opensheet.elk.sh. Backup: Google's CSV export of the tab (keeps every cell).
    // Not the "gviz" CSV: it drops cells in mixed-type columns (it lost 16 sale prices in testing).
    const get = async (u, ms) => {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
      try {
        const r = await fetch(u, { cache: 'no-store', signal: ctrl.signal });
        if (!r.ok) throw new Error('Sheet ' + r.status);
        const text = await r.text();
        return text.trim().startsWith('[') ? JSON.parse(text) : csvToObjects(text);
      } finally { clearTimeout(t); }
    };
    let rows;
    try { rows = await get(`https://opensheet.elk.sh/${id}/${sheet}`, 8000); }
    catch (e) {
      console.warn('opensheet failed, using Google export:', e);
      rows = await get(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${encodeURIComponent(CFG.sheetGid ?? 0)}`, 15000);
      if (!rows.length || !('Item Name' in rows[0])) throw new Error('Backup sheet tab is not the Inventory tab (check sheetGid in config.js)');
    }
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), rows })); } catch {}
    return rows;
  }

  function csvToObjects(text) {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i], nx = text[i + 1];
      if (ch === '"') { if (q && nx === '"') { cell += '"'; i++; } else q = !q; }
      else if (ch === ',' && !q) { row.push(cell); cell = ''; }
      else if ((ch === '\n' || ch === '\r') && !q) {
        if (ch === '\r' && nx === '\n') i++;
        row.push(cell); if (row.some((v) => v.trim())) rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    row.push(cell); if (row.some((v) => v.trim())) rows.push(row);
    const head = (rows.shift() || []).map((h) => h.trim());
    return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] || ''])));
  }

  function normalize(row, index) {
    const name = field(row, 'Item Name');
    if (!name) return null;
    const cat = categoryKey(field(row, 'Category'));
    const saleRaw = field(row, 'Sale Price');
    const value = num(field(row, 'Item Value'));
    const price = num(saleRaw);
    const discountRaw = num(field(row, 'Discount'));
    const discount = discountRaw > 0 ? Math.round(discountRaw) : value > 0 && price > 0 && price < value ? Math.round(((value - price) / value) * 100) : 0;
    const status = statusInfo(field(row, 'Available'));
    const added = parseDate(field(row, 'Date Added'));
    const updated = parseDate(field(row, 'Last Updated'));
    return {
      index,
      id: field(row, 'Item ID') || field(row, 'Internal Code') || `item-${index + 1}`,
      itemId: field(row, 'Item ID'),
      name,
      category: cat.name,
      categoryKey: cat.key,
      isAdult: adult.has(cat.key),
      isHidden: hidden.has(cat.key),
      value,
      price,                       // 0 = "Contact for price"
      savings: value > price && price > 0 ? value - price : 0,
      discount,
      description: field(row, 'Description'),
      code: field(row, 'Internal Code'),
      az: field(row, 'Az') || field(row, 'AZ'),
      notes: field(row, 'Notes'),
      status,
      sold: SHOW_AVAIL && status.key === 'sold',
      images: field(row, 'Image URLs').split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean),
      amazonLink: field(row, 'Amazon Link'),
      ebayLink: field(row, 'Ebay Link'),
      onEbay: ['yes', 'true', 'y', '1'].includes(lower(field(row, 'On Ebay'))),
      added, updated,
      addedText: field(row, 'Date Added'),
      search: Object.values(row).join(' ').toLowerCase(),
    };
  }

  function getItems() {
    if (!itemsPromise) {
      itemsPromise = loadRows().then((rows) => rows.map(normalize).filter(Boolean).filter((i) => !i.isHidden));
      itemsPromise.catch(() => { itemsPromise = null; });
    }
    return itemsPromise;
  }

  const isNew = (i) => {
    if (!i.added) return false;
    const days = (Date.now() - i.added.getTime()) / 86400000;
    return days >= 0 && days <= (CFG.newArrivalDays || 30);
  };
  const amazonUrl = (i) => i.amazonLink || `https://www.amazon.com/s?k=${encodeURIComponent(i.name)}`;
  const itemUrl = (i) => url(`pages/item.html?id=${encodeURIComponent(i.id)}`);
  const categoryUrl = (name) => url(`index.html?category=${encodeURIComponent(name)}#shop`);

  // ---------- wishlist ----------
  const WISH_KEY = 'bow_wishlist';
  const wishlist = {
    all: () => { try { return JSON.parse(localStorage.getItem(WISH_KEY) || '[]'); } catch { return []; } },
    has: (id) => wishlist.all().includes(id),
    toggle(id) {
      const list = wishlist.all();
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      localStorage.setItem(WISH_KEY, JSON.stringify(next));
      updateWishCount();
      return next.includes(id);
    },
  };
  function updateWishCount() {
    const n = wishlist.all().length;
    $$('[data-wish-count]').forEach((el) => { el.textContent = n; el.hidden = n === 0; });
  }

  // ---------- adult gate ----------
  const ADULT_KEY = 'bow_adult_verified';
  const adultOk = () => localStorage.getItem(ADULT_KEY) === 'yes';
  function confirmAdult() {
    if (adultOk()) return Promise.resolve(true);
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'modal-backdrop';
      wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="ageTitle">
        <div class="modal-icon">🔞</div>
        <h2 id="ageTitle">Are you 18 or older?</h2>
        <p>This category may contain adult items. Please confirm you are at least 18 years old to continue.</p>
        <div class="modal-actions"><button class="btn btn-primary" data-yes>I'm 18 or older</button><button class="btn btn-ghost" data-no>Go back</button></div>
      </div>`;
      const done = (ok) => { if (ok) localStorage.setItem(ADULT_KEY, 'yes'); wrap.remove(); resolve(ok); };
      wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-no]')) done(false); if (e.target.closest('[data-yes]')) done(true); });
      document.body.appendChild(wrap);
      $('[data-yes]', wrap).focus();
    });
  }

  // ---------- toast ----------
  function toast(msg) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---------- product card ----------
  function priceHtml(i, big = false) {
    if (!i.price) return `<div class="price ${big ? 'price-lg' : ''}"><span class="price-now ask">Ask for price</span></div>`;
    return `<div class="price ${big ? 'price-lg' : ''}">
      <span class="price-now">${money(i.price)}</span>
      ${i.value > i.price ? `<span class="price-was"><span class="sr">Amazon price </span><s>${money(i.value)}</s> on Amazon</span>` : ''}
    </div>`;
  }
  // Status tag: only when availability is switched on in config.js.
  const statusPill = (i) => SHOW_AVAIL && i.status.label
    ? `<span class="pill pill-${i.status.tone}" ${i.status.note ? `title="${esc(i.status.note)}"` : ''}>${esc(i.status.label)}</span>` : '';

  function card(i) {
    const img = i.images[0] || NO_IMAGE;
    const wished = wishlist.has(i.id);
    return `<article class="card ${i.sold ? 'is-sold' : ''}">
      <div class="card-media">
        <a href="${itemUrl(i)}" tabindex="-1" aria-hidden="true"><img src="${esc(img)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${NO_IMAGE}'"></a>
        ${i.discount && !i.sold ? `<span class="tag-off">−${i.discount}%</span>` : ''}
        ${isNew(i) && !i.sold ? '<span class="tag-new">New</span>' : ''}
        ${i.sold ? '<span class="tag-sold">Sold</span>' : ''}
        <button class="wish ${wished ? 'on' : ''}" data-wish="${esc(i.id)}" aria-pressed="${wished}" aria-label="${wished ? 'Remove from' : 'Save to'} wishlist">${wished ? '♥' : '♡'}</button>
      </div>
      <div class="card-body">
        <div class="card-meta"><a class="card-cat" href="${categoryUrl(i.category)}">${esc(i.category)}</a>${statusPill(i)}</div>
        <h3 class="card-title"><a href="${itemUrl(i)}">${esc(i.name)}</a></h3>
        ${priceHtml(i)}
        <div class="card-foot">
          ${i.savings && !i.sold ? `<span class="save-line">Save ${money(i.savings)}</span>` : '<span></span>'}
          <a class="card-amz" href="${esc(amazonUrl(i))}" target="_blank" rel="noopener" title="Compare this item on Amazon">Compare ↗</a>
        </div>
      </div>
    </article>`;
  }

  // ---------- header / footer ----------
  const NAV = [
    ['index.html', 'Shop', 'home'],
    ['pages/deals.html', 'Deals', 'deals'],
    ['pages/new-arrivals.html', 'New Arrivals', 'arrivals'],
    ['pages/categories.html', 'Categories', 'categories'],
    ['pages/wishlist.html', 'Wishlist', 'wishlist'],
    ['pages/contact.html', 'About & Contact', 'contact'],
  ];
  const BIZ = CFG.business || {};
  const place = [BIZ.city, BIZ.state].filter(Boolean).join(', ');
  function renderChrome() {
    const page = document.body.dataset.page || '';
    const header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML = `
      ${CFG.notice ? `<div class="notice-bar" role="note"><div class="wrap"><span aria-hidden="true">📦</span> ${esc(CFG.notice)}</div></div>` : ''}
      <div class="header-row wrap">
        <a class="brand" href="${url('index.html')}">
          <span class="brand-mark" aria-hidden="true">B</span>
          <span class="brand-text"><strong>${esc(CFG.storeName)}</strong>${place ? `<small>📍 ${esc(place)}</small>` : ''}</span>
        </a>
        <nav class="nav" aria-label="Main">
          ${NAV.slice(0, 4).map(([href, label, key]) => `<a href="${url(href)}" ${key === page ? 'aria-current="page"' : ''}>${label}</a>`).join('')}
          <a href="${url('pages/contact.html')}" ${page === 'contact' ? 'aria-current="page"' : ''}>About</a>
        </nav>
        <form class="search" role="search" action="${url('index.html')}">
          <input type="search" name="q" placeholder="Search the marketplace…" aria-label="Search the marketplace" value="${esc(new URLSearchParams(location.search).get('q') || '')}">
          <button type="submit" aria-label="Search">⌕</button>
        </form>
        <a class="wish-link" href="${url('pages/wishlist.html')}" aria-label="Wishlist" ${page === 'wishlist' ? 'aria-current="page"' : ''}>♡<span class="count" data-wish-count hidden>0</span></a>
      </div>`;
    document.body.prepend(header);
    const search = $('.search', header);
    search.addEventListener('submit', (e) => {
      // On the shop page, search in place.
      if (page === 'home' && window.BowHomeSearch) { e.preventDefault(); window.BowHomeSearch(search.q.value); }
    });

    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `<div class="wrap footer-grid">
      <div><span class="foot-brand"><span class="brand-mark" aria-hidden="true">B</span>${esc(CFG.storeName)}</span>
        <p>Operated by ${esc(BIZ.operator || 'Bow Service')}${place ? ` in ${esc(place)}` : ''}. A one-person local marketplace. Thanks for shopping small!</p></div>
      <div><strong>Shop</strong>${NAV.slice(0, 4).map(([h, l]) => `<a href="${url(h)}">${l}</a>`).join('')}</div>
      <div><strong>Info</strong><a href="${url('pages/contact.html')}">About & Contact</a><a href="${url('pages/terms.html')}">Terms</a><a href="${url('pages/wishlist.html')}">Wishlist</a></div>
      <p class="fine">Not affiliated with Amazon, eBay, Google, or any outside marketplace. All third-party names belong to their owners.</p>
    </div>`;
    document.body.appendChild(footer);
    updateWishCount();
  }

  // Wishlist hearts work on every page.
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-wish]');
    if (!b) return;
    e.preventDefault();
    const on = wishlist.toggle(b.dataset.wish);
    b.classList.toggle('on', on); b.textContent = on ? '♥' : '♡';
    b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', (on ? 'Remove from' : 'Save to') + ' wishlist');
    toast(on ? 'Saved to your wishlist' : 'Removed from your wishlist');
    document.dispatchEvent(new CustomEvent('bow:wishlist'));
  });

  document.addEventListener('DOMContentLoaded', renderChrome);

  window.Bow = {
    CFG, SHOW_AVAIL, BIZ, place, url, NO_IMAGE, esc, num, money, moneyShort, parseDate, lower, $, $$,
    getItems, isNew, amazonUrl, itemUrl, categoryUrl, wishlist, adultOk, confirmAdult, toast,
    card, priceHtml, statusPill,
    errorHtml: (msg = 'We couldn’t load the listings right now. Please refresh the page or try again in a minute.') =>
      `<div class="empty"><div class="empty-icon">⚠️</div><h3>Listings unavailable</h3><p>${esc(msg)}</p><button class="btn btn-primary" onclick="sessionStorage.clear();location.reload()">Try again</button></div>`,
    skeleton: (n = 8) => Array.from({ length: n }, () => '<div class="card skeleton"><div class="card-media"></div><div class="card-body"><span></span><span></span><span class="short"></span></div></div>').join(''),
  };
})();
