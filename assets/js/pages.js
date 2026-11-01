/* Inner pages: item, deals, new arrivals, categories, wishlist, contact */
(function () {
  'use strict';
  const B = window.Bow, { $, $$, esc, money } = B;
  const PAGE = 48;
  const page = document.body.dataset.page;

  const handlers = { item, deals, arrivals, categories, wishlist, contact };
  document.addEventListener('DOMContentLoaded', () => { if (handlers[page]) handlers[page](); });

  async function load(target) {
    try { return await B.getItems(); }
    catch (e) { console.error(e); if (target) target.innerHTML = B.errorHtml(); return null; }
  }
  const fillCats = (select, list) => {
    [...new Set(list.map((i) => i.category))].sort().forEach((c) => select.add(new Option(c, c)));
  };
  // Simple "show more" paging for a grid.
  function pager(list, limit, btn, grid) {
    const shown = list.slice(0, limit);
    grid.innerHTML = shown.map(B.card).join('');
    btn.hidden = shown.length >= list.length;
    btn.textContent = `Show more (${(list.length - shown.length).toLocaleString()} left)`;
    return shown.length;
  }

  // ======================= ITEM =======================
  async function item() {
    const root = $('#itemRoot');
    const items = await load(root);
    if (!items) return;
    const id = new URLSearchParams(location.search).get('id') || '';
    const i = items.find((x) => x.id === id) || items.find((x) => B.lower(x.id) === B.lower(id) || B.lower(x.code) === B.lower(id));
    if (!i) {
      root.innerHTML = `<div class="section"><div class="empty"><div class="empty-icon">🔎</div><h3>Item not found</h3>
        <p>This listing may have been removed or its link changed.</p><a class="btn btn-primary" href="${B.url('index.html#shop')}">Browse all items</a></div></div>`;
      return;
    }
    if (i.isAdult && !(await B.confirmAdult())) { location.href = B.url('index.html'); return; }
    document.title = `${i.name} | ${B.CFG.storeName}`;

    const imgs = i.images.length ? i.images : [B.NO_IMAGE];
    const wished = B.wishlist.has(i.id);
    const c = B.CFG.contact || {};
    const ask = c.email ? `mailto:${c.email}?subject=${encodeURIComponent('Question about: ' + i.name.slice(0, 80))}&body=${encodeURIComponent(`Hi! Is this item still available?\n\n${i.name}\nItem: ${i.id}${i.code ? ' / ' + i.code : ''}\n${location.href}`)}` : B.url('pages/contact.html');
    const similar = items.filter((x) => x.id !== i.id && x.category === i.category && !x.sold && !x.isAdult)
      .sort((a, b) => (b.images.length > 0) - (a.images.length > 0) || b.discount - a.discount).slice(0, 8);
    const fmtDate = (d) => d ? d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

    root.innerHTML = `
      <nav class="crumbs" aria-label="Breadcrumb"><a href="${B.url('index.html')}">Shop</a> › <a href="${B.categoryUrl(i.category)}">${esc(i.category)}</a> › <span>${esc(i.name.slice(0, 60))}${i.name.length > 60 ? '…' : ''}</span></nav>
      ${i.sold ? `<div class="notice sold"><span class="ico">😢</span><div><h2>Sorry, this item has sold.</h2>
        <p>You can still buy it on Amazon, or check the similar items below.</p>
        <a class="btn btn-primary btn-sm" href="${esc(B.amazonUrl(i))}" target="_blank" rel="noopener">View on Amazon ↗</a></div></div>` : ''}
      <div class="item-layout">
        <div class="gallery">
          <div class="gallery-main">
            <img id="mainImg" src="${esc(imgs[0])}" alt="${esc(i.name)}" onerror="this.onerror=null;this.src='${B.NO_IMAGE}'">
            ${imgs.length > 1 ? `<button class="gallery-nav prev" data-step="-1" aria-label="Previous photo">‹</button><button class="gallery-nav next" data-step="1" aria-label="Next photo">›</button><span class="gallery-count" id="imgCount">1 / ${imgs.length}</span>` : ''}
            <span class="card-badges">${i.discount && !i.sold ? `<span class="badge badge-deal">${i.discount}% off</span>` : ''}${B.isNew(i) && !i.sold ? '<span class="badge badge-new">New</span>' : ''}</span>
          </div>
          ${imgs.length > 1 ? `<div class="thumbs">${imgs.map((src, n) => `<button class="${n ? '' : 'on'}" data-img="${n}" aria-label="Photo ${n + 1}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
        </div>
        <div>
          <div class="buybox">
            <div class="top"><a class="card-cat" href="${B.categoryUrl(i.category)}">${esc(i.category)}</a>${B.statusPill(i)}</div>
            <h1>${esc(i.name)}</h1>
            ${i.price ? `<div class="compare">
                ${i.value ? `<div class="amz"><small>Amazon price</small><b>${money(i.value)}</b></div>` : ''}
                <div class="bow" ${i.value ? '' : 'style="grid-column:1/-1"'}><small>Bow price</small><b>${money(i.price)}</b></div>
              </div>
              ${i.savings && !i.sold ? `<div class="savings-banner">🎉 You save ${money(i.savings)} (${i.discount}% off Amazon)</div>` : ''}`
            : `<div class="compare"><div class="bow" style="grid-column:1/-1"><small>Bow price</small><b>Contact for price</b></div></div>`}
            ${B.SHOW_AVAIL && i.status.note && !i.sold ? `<p class="pill pill-${i.status.tone}" style="display:inline-block;margin:0 0 6px">${esc(i.status.note)}</p>` : ''}
            <div class="buy-actions">
              ${!i.sold ? `<a class="btn btn-pink btn-block" href="${esc(ask)}">💬 Ask about this item</a>` : ''}
              <a class="btn btn-primary btn-block" href="${esc(B.amazonUrl(i))}" target="_blank" rel="noopener">Compare on Amazon ↗</a>
              <button class="btn btn-ghost btn-block" id="wishBtn">${wished ? '♥ Saved to wishlist' : '♡ Save to wishlist'}</button>
              ${i.ebayLink ? `<a class="btn btn-ghost btn-block" href="${esc(i.ebayLink)}" target="_blank" rel="noopener">View online listing ↗</a>` : ''}
            </div>
            ${i.description ? `<h3 style="margin:6px 0 6px;font-size:16px">Description</h3><p class="desc">${esc(i.description)}</p>` : ''}
            <dl class="details">
              ${i.notes ? `<dt>Details</dt><dd>${esc(i.notes)}</dd>` : ''}
              ${B.SHOW_AVAIL ? `<dt>Status</dt><dd>${esc(i.status.label)}</dd>` : ''}
              ${i.itemId ? `<dt>Item ID</dt><dd>${esc(i.itemId)}</dd>` : ''}
              ${i.code ? `<dt>Internal code</dt><dd>${esc(i.code)}</dd>` : ''}
              ${i.az ? `<dt>AZ</dt><dd>${esc(i.az)}</dd>` : ''}
              ${i.added ? `<dt>Listed</dt><dd>${fmtDate(i.added)}</dd>` : ''}
              ${i.updated ? `<dt>Updated</dt><dd>${fmtDate(i.updated)}</dd>` : ''}
            </dl>
            ${!B.SHOW_AVAIL ? '<div class="ask-note">📦 <b>We’re moving warehouses.</b> Please ask Bow to confirm this item is on hand before you buy.</div>' : ''}
            <div class="mini-promise">🦄 <b>Bow Promise:</b> find it cheaper on Amazon and Bow will match the price and take an extra 20% off your order.</div>
          </div>
        </div>
      </div>
      <section class="section">
        <div class="section-head"><div><p class="eyebrow">You might also like</p><h2>More in ${esc(i.category)}</h2></div><a class="link-more" href="${B.categoryUrl(i.category)}">See all →</a></div>
        ${similar.length ? `<div class="rail">${similar.map(B.card).join('')}</div>` : '<p style="color:var(--ink-3)">No other items in this category right now.</p>'}
      </section>`;

    // gallery
    let cur = 0;
    const show = (n) => {
      cur = (n + imgs.length) % imgs.length;
      $('#mainImg').src = imgs[cur];
      $$('.thumbs button').forEach((b, k) => b.classList.toggle('on', k === cur));
      const cnt = $('#imgCount'); if (cnt) cnt.textContent = `${cur + 1} / ${imgs.length}`;
    };
    root.addEventListener('click', (e) => {
      const s = e.target.closest('[data-step]'); if (s) show(cur + Number(s.dataset.step));
      const t = e.target.closest('[data-img]'); if (t) show(Number(t.dataset.img));
    });
    document.addEventListener('keydown', (e) => {
      if (imgs.length < 2 || /input|textarea|select/i.test(document.activeElement.tagName)) return;
      if (e.key === 'ArrowRight') show(cur + 1);
      if (e.key === 'ArrowLeft') show(cur - 1);
    });
    $('#wishBtn').addEventListener('click', (e) => {
      const on = B.wishlist.toggle(i.id);
      e.currentTarget.textContent = on ? '♥ Saved to wishlist' : '♡ Save to wishlist';
      B.toast(on ? 'Saved to your wishlist' : 'Removed from your wishlist');
    });
  }

  // ======================= DEALS =======================
  async function deals() {
    const grid = $('#grid');
    grid.innerHTML = B.skeleton(8);
    const items = await load(grid);
    if (!items) return;
    const all = items.filter((i) => !i.sold && !i.isAdult && i.discount > 0);
    $('#dCount').textContent = all.length.toLocaleString();
    $('#dBest').textContent = all.length ? Math.max(...all.map((i) => i.discount)) + '%' : '–';
    $('#dSave').textContent = money(all.reduce((s, i) => s + i.savings, 0));
    fillCats($('#dCat'), all);
    if (!B.SHOW_AVAIL) $('#dNow').closest('label').hidden = true;
    let limit = PAGE;
    const sorters = {
      discount: (a, b) => b.discount - a.discount || b.savings - a.savings,
      savings: (a, b) => b.savings - a.savings,
      priceLow: (a, b) => a.price - b.price,
      newest: (a, b) => (b.added?.getTime() || 0) - (a.added?.getTime() || 0) || b.index - a.index,
    };
    const render = () => {
      const min = Number($('#dMin').value), cat = $('#dCat').value, now = B.SHOW_AVAIL && $('#dNow').checked;
      const list = all.filter((i) => i.discount >= min && (!cat || i.category === cat) && (!now || i.status.key === 'available'))
        .sort(sorters[$('#dSort').value]);
      const top = list.find((i) => i.images.length);
      const box = $('#topDeal');
      box.hidden = !top;
      if (top) box.innerHTML = `<div class="feature">
          <a class="feature-media" href="${B.itemUrl(top)}"><img src="${esc(top.images[0])}" alt=""><span class="card-badges"><span class="badge badge-deal">${top.discount}% off</span></span></a>
          <div><p class="eyebrow">⭐ Featured deal</p><h2>${esc(top.name)}</h2>
            ${B.priceHtml(top, true)}
            ${top.savings ? `<div class="save-line" style="font-size:16px;margin-top:6px">You save ${money(top.savings)}</div>` : ''}
            <div class="actions"><a class="btn btn-pink" href="${B.itemUrl(top)}">View deal</a><a class="btn btn-ghost" href="${esc(B.amazonUrl(top))}" target="_blank" rel="noopener">Compare on Amazon ↗</a></div>
          </div></div>`;
      const shown = pager(list, limit, $('#loadMore'), grid);
      if (!list.length) grid.innerHTML = '<div class="empty"><div class="empty-icon">🏷️</div><h3>No deals match</h3><p>Try a smaller minimum discount or another category.</p></div>';
      $('#dResult').innerHTML = `Showing <b>${shown}</b> of <b>${list.length}</b> deals`;
    };
    ['dMin', 'dCat', 'dSort', 'dNow'].forEach((id) => $('#' + id).addEventListener('input', () => { limit = PAGE; render(); }));
    $('#loadMore').addEventListener('click', () => { limit += PAGE; render(); });
    render();
  }

  // ======================= NEW ARRIVALS =======================
  async function arrivals() {
    const grid = $('#grid');
    grid.innerHTML = B.skeleton(8);
    const items = await load(grid);
    if (!items) return;
    const pool = items.filter((i) => !i.isAdult);
    fillCats($('#aCat'), pool);
    let tab = new URLSearchParams(location.search).get('tab') || 'recent';
    if (!B.SHOW_AVAIL) { tab = 'recent'; $('#tabs').hidden = true; $('#aSold').closest('label').hidden = true; $('#aRange').closest('.toolbar').style.marginTop = '24px'; }
    let limit = PAGE;
    const within = (i, days) => days === 'all' || (i.added && (Date.now() - i.added) / 86400000 <= Number(days));
    const render = () => {
      const days = $('#aRange').value, cat = $('#aCat').value, sold = $('#aSold').checked;
      const base = pool.filter((i) => (sold || !i.sold) && (!cat || i.category === cat));
      const sets = {
        recent: base.filter((i) => i.added && within(i, days)).sort((a, b) => b.added - a.added || b.index - a.index),
        ordered: base.filter((i) => i.status.key === 'ordered').sort((a, b) => (b.added?.getTime() || 0) - (a.added?.getTime() || 0) || b.index - a.index),
        processing: base.filter((i) => i.status.key === 'processing').sort((a, b) => b.index - a.index),
      };
      $('#nRecent').textContent = sets.recent.length; $('#nOrdered').textContent = sets.ordered.length; $('#nProcessing').textContent = sets.processing.length;
      $$('.tab').forEach((t) => t.setAttribute('aria-selected', t.dataset.tab === tab));
      $('#aRange').disabled = tab !== 'recent';
      const list = sets[tab];
      const shown = pager(list, limit, $('#loadMore'), grid);
      if (!list.length) grid.innerHTML = `<div class="empty"><div class="empty-icon">${tab === 'recent' ? '✨' : '📦'}</div><h3>Nothing here right now</h3><p>${tab === 'recent' ? 'Try a longer date range.' : 'Check back soon!'}</p></div>`;
      const label = { recent: 'recently added', ordered: 'on order', processing: 'being processed' }[tab];
      $('#aResult').innerHTML = `Showing <b>${shown}</b> of <b>${list.length}</b> items ${label}`;
    };
    $('#tabs').addEventListener('click', (e) => { const t = e.target.closest('[data-tab]'); if (!t) return; tab = t.dataset.tab; limit = PAGE; history.replaceState(null, '', '?tab=' + tab); render(); });
    ['aRange', 'aCat', 'aSold'].forEach((id) => $('#' + id).addEventListener('input', () => { limit = PAGE; render(); }));
    $('#loadMore').addEventListener('click', () => { limit += PAGE; render(); });
    render();
  }

  // ======================= CATEGORIES =======================
  async function categories() {
    const grid = $('#catGrid');
    grid.innerHTML = '<p class="result-line">Loading categories…</p>';
    const items = await load(grid);
    if (!items) return;
    if (!B.SHOW_AVAIL) $('#cSold').closest('label').hidden = true;
    const render = () => {
      const q = B.lower($('#cSearch').value), sold = $('#cSold').checked;
      const groups = new Map();
      for (const i of items) {
        if (!sold && i.sold) continue;
        const g = groups.get(i.category) || { name: i.category, adult: i.isAdult, items: [] };
        g.items.push(i); groups.set(i.category, g);
      }
      let list = [...groups.values()].filter((g) => !q || B.lower(g.name).includes(q));
      list.sort($('#cSort').value === 'name' ? (a, b) => a.name.localeCompare(b.name) : (a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name));
      grid.innerHTML = list.length ? list.map((g) => {
        const pics = g.items.filter((i) => i.images.length).sort((a, b) => b.discount - a.discount).slice(0, 4).map((i) => i.images[0]);
        const locked = g.adult && !B.adultOk();
        const n = pics.length >= 4 ? 4 : pics.length >= 2 ? 2 : 1;
        return `<a class="cat-card ${locked ? 'locked' : ''}" href="${B.categoryUrl(g.name)}" data-adult="${g.adult ? 1 : ''}">
          <div class="cat-media n${n}">${(pics.length ? pics : [B.NO_IMAGE]).slice(0, n).map((p) => `<img src="${esc(p)}" alt="" loading="lazy">`).join('')}</div>
          <div class="cat-body"><strong>${g.adult ? '🔞 ' : ''}${esc(g.name)}</strong><span>${g.items.length} item${g.items.length === 1 ? '' : 's'}</span></div>
        </a>`;
      }).join('') : '<div class="empty"><h3>No categories match</h3></div>';
    };
    grid.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-adult="1"]');
      if (a && !B.adultOk()) { e.preventDefault(); if (await B.confirmAdult()) location.href = a.href; }
    });
    ['cSearch', 'cSort', 'cSold'].forEach((id) => $('#' + id).addEventListener('input', render));
    render();
  }

  // ======================= WISHLIST =======================
  async function wishlist() {
    const grid = $('#grid');
    grid.innerHTML = B.skeleton(4);
    const items = await load(grid);
    if (!items) return;
    const render = () => {
      const ids = B.wishlist.all();
      const list = ids.map((id) => items.find((i) => i.id === id)).filter(Boolean);
      const missing = ids.length - list.length;
      grid.innerHTML = list.length ? list.map(B.card).join('')
        : `<div class="empty"><div class="empty-icon">♡</div><h3>Your wishlist is empty</h3><p>Tap the heart on any item to save it here.</p><a class="btn btn-primary" href="${B.url('index.html#shop')}">Start browsing</a></div>`;
      const sold = B.SHOW_AVAIL ? list.filter((i) => i.sold).length : 0;
      $('#wResult').innerHTML = list.length
        ? `<span><b>${list.length}</b> saved item${list.length === 1 ? '' : 's'}${sold ? ` · ${sold} sold` : ''}${missing ? ` · ${missing} no longer listed` : ''}</span>`
        : '';
      $('#wClear').hidden = !ids.length;
    };
    $('#wClear').addEventListener('click', () => { localStorage.setItem('bow_wishlist', '[]'); document.querySelectorAll('[data-wish-count]').forEach((el) => { el.hidden = true; }); render(); });
    document.addEventListener('bow:wishlist', render);
    render();
  }

  // ======================= CONTACT =======================
  function contact() {
    const biz = B.BIZ, place = B.place, op = biz.operator || 'Bow Service';
    if (place) {
      $('#aboutLead').textContent = `A local marketplace operated by ${op} in ${place}, for local finds, collectibles and private sale listings, all priced below Amazon.`;
      $('#locTitle').textContent = `Based in ${place}`;
      $('#locText').textContent = `${B.CFG.storeName} is operated by ${op}. Pickup, delivery and shipping are worked out directly with Bow.`;
    }
    const c = B.CFG.contact || {};
    const cards = [];
    if (c.email) cards.push(`<a class="info" href="mailto:${esc(c.email)}" style="text-decoration:none;color:inherit"><div class="ico">✉️</div><h3>Email</h3><p>${esc(c.email)}</p></a>`);
    if (c.phone) cards.push(`<a class="info" href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}" style="text-decoration:none;color:inherit"><div class="ico">📞</div><h3>Phone / text</h3><p>${esc(c.phone)}</p></a>`);
    if (c.facebook) cards.push(`<a class="info" href="${esc(c.facebook)}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><div class="ico">👋</div><h3>Facebook</h3><p>Message Bow Service on Facebook</p></a>`);
    $('#contactCards').innerHTML = cards.join('');
    $('#contactSection').hidden = !cards.length;
  }
})();
