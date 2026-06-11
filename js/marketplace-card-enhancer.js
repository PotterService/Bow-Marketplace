(function () {
  'use strict';

  const cfg = window.STORE_CONFIG || {};
  const sheetId = cfg.sheetId || '';
  const sheetName = encodeURIComponent(cfg.sheetName || 'Inventory');
  const apiUrl = `https://opensheet.elk.sh/${sheetId}/${sheetName}`;
  let items = [];
  let byId = new Map();
  let byName = new Map();

  function injectStyles() {
    if (document.getElementById('bow-marketplace-enhancer-style')) return;
    const style = document.createElement('style');
    style.id = 'bow-marketplace-enhancer-style';
    style.textContent = `
      .product-card, .bow-extra-card { position: relative; }
      .bow-discount-ribbon {
        position:absolute; top:12px; left:12px; z-index:5;
        background:linear-gradient(90deg,#ff77ff,#ffb3ff); color:#111;
        border-radius:999px; padding:7px 12px; font-size:13px; font-weight:900;
        box-shadow:0 5px 16px rgba(0,0,0,.22); letter-spacing:.3px;
      }
      .bow-value-line { color:#777; text-decoration:line-through; margin-left:8px; font-size:14px; }
      .bow-discount-pill {
        display:block; width:100%; box-sizing:border-box; margin:8px 0 5px;
        background:#ffe5ff; color:#980098; border-radius:999px; padding:5px 10px;
        font-size:12px; font-weight:900;
      }
      .deal-strip{background:linear-gradient(135deg,#fff3ff,#ffffff);border:2px solid rgba(255,119,255,.35);border-radius:24px;padding:18px;box-shadow:0 10px 30px rgba(53,17,62,.12);margin-bottom:24px;}
      .deal-strip .section-title{background:#35113e;color:#fff;border-radius:18px;padding:14px 16px;margin-bottom:16px;}
      .deal-strip .section-title .eyebrow{color:#ffb3ff;}
      .deal-strip .section-title h2{color:#fff;margin:0;}
      .deal-strip .small-btn{background:#fff;color:#35113e;border-color:#fff;font-weight:900;}
      .deal-rail{background:#fff;border-radius:18px;padding:12px;}
      .bow-ic-line {
        display:inline-block; margin:7px 0 3px; padding:4px 8px; border-radius:999px;
        background:#f4f0ff; color:#35113e; font-size:12px; font-weight:800;
      }
      .bow-item-extra-box {
        margin:14px 0; padding:13px; border-radius:14px; background:#fff7ff;
        border:1px solid rgba(255,119,255,.35); color:#35113e;
      }
      .bow-item-extra-box strong { display:inline-block; margin-right:8px; }
    `;
    document.head.appendChild(style);
  }

  function clean(value) { return String(value || '').trim(); }
  function money(value) {
    const n = Number(String(value || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  function moneyText(value) {
    const n = money(value);
    return n ? `$${n.toFixed(2)}` : '';
  }
  function discountPercent(item) {
    const raw = clean(item.Discount);
    const fromRaw = Number(raw.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(fromRaw) && fromRaw > 0) return Math.round(fromRaw);
    const value = money(item['Item Value']);
    const sale = money(item['Sale Price']);
    if (!value || !sale || sale >= value) return 0;
    return Math.round(((value - sale) / value) * 100);
  }
  function itemKey(item) {
    return clean(item['Item ID']) || clean(item['Internal Code']) || clean(item['Item Name']);
  }
  function decodeIdFromHref(href) {
    try {
      const u = new URL(href, location.href);
      return clean(u.searchParams.get('id') || u.searchParams.get('item') || '');
    } catch { return ''; }
  }
  function normalizeKey(v) { return clean(v).toLowerCase(); }
  function findItemFromCard(card) {
    const link = card.querySelector('a[href*="item.html"]');
    const id = link ? decodeIdFromHref(link.href) : '';
    if (id && byId.has(normalizeKey(id))) return byId.get(normalizeKey(id));
    const title = clean(card.querySelector('h3')?.textContent || card.querySelector('.product-title')?.textContent || '');
    if (title && byName.has(normalizeKey(title))) return byName.get(normalizeKey(title));
    return null;
  }
  function ensureImageWrap(card) {
    const img = card.querySelector('img');
    if (!img) return card;
    const wrap = img.closest('.product-image-wrap') || img.parentElement || card;
    if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
    return wrap;
  }
  function enhanceCard(card) {
    if (!card || card.dataset.bowEnhanced === '1') return;
    const item = findItemFromCard(card);
    if (!item) return;
    card.dataset.bowEnhanced = '1';

    const discount = discountPercent(item);
    const value = moneyText(item['Item Value']);
    const sale = moneyText(item['Sale Price']);
    const ic = clean(item['Internal Code']);

    if (discount > 0) {
      const wrap = ensureImageWrap(card);
      if (!wrap.querySelector('.bow-discount-ribbon')) {
        const ribbon = document.createElement('div');
        ribbon.className = 'bow-discount-ribbon';
        ribbon.textContent = `${discount}% OFF`;
        wrap.appendChild(ribbon);
      }
    }

    const priceHost = card.querySelector('.product-info') || card;
    if (sale && value) {
      const priceStrong = priceHost.querySelector('.price-row strong, .price strong, strong');
      if (priceStrong && priceStrong.textContent.includes('$')) {
        priceStrong.textContent = sale;
        if (!priceStrong.parentElement.querySelector('.bow-value-line')) {
          const v = document.createElement('span');
          v.className = 'bow-value-line';
          v.textContent = `Value ${value}`;
          priceStrong.insertAdjacentElement('afterend', v);
        }
      }
    }

    const title = card.querySelector('h3') || priceHost.firstElementChild || priceHost;
    if (ic && !card.querySelector('.bow-ic-line')) {
      const line = document.createElement('div');
      line.className = 'bow-ic-line';
      line.textContent = `IC: ${ic}`;
      title.insertAdjacentElement('afterend', line);
    }

    if (discount > 0 && !card.querySelector('.bow-discount-pill')) {
      const pill = document.createElement('div');
      pill.className = 'bow-discount-pill';
      pill.textContent = `${discount}% off`;
      const anchor = priceHost.querySelector('.price-row, .price') || priceHost.querySelector('.bow-ic-line') || title;
      anchor.insertAdjacentElement('afterend', pill);
    }
  }

  function enhanceCards() {
    document.querySelectorAll('.product-card, .bow-extra-card').forEach(enhanceCard);
  }

  function findItemForItemPage() {
    const id = decodeIdFromHref(location.href);
    if (id && byId.has(normalizeKey(id))) return byId.get(normalizeKey(id));
    return null;
  }

  function enhanceItemPage() {
    const itemPage = document.getElementById('itemPage');
    if (!itemPage || itemPage.dataset.bowEnhanced === '1') return;
    const item = findItemForItemPage();
    if (!item) return;
    const discount = discountPercent(item);
    const value = moneyText(item['Item Value']);
    const sale = moneyText(item['Sale Price']);
    const ic = clean(item['Internal Code']);
    if (!discount && !ic && !value) return;
    itemPage.dataset.bowEnhanced = '1';
    const box = document.createElement('div');
    box.className = 'bow-item-extra-box';
    box.innerHTML = `
      ${ic ? `<div><strong>Internal Code:</strong> ${escapeHtml(ic)}</div>` : ''}
      ${discount ? `<div><strong>Discount:</strong> ${discount}% off</div>` : ''}
      ${sale ? `<div><strong>Sale Price:</strong> ${sale}</div>` : ''}
      ${value ? `<div><strong>Item Value:</strong> ${value}</div>` : ''}
    `;
    const target = itemPage.querySelector('main, section, .item-detail, .product-detail') || itemPage;
    target.prepend(box);
  }

  function escapeHtml(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  async function loadItems() {
    const res = await fetch(apiUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error('Could not load marketplace sheet');
    items = await res.json();
    byId = new Map();
    byName = new Map();
    items.forEach(item => {
      [item['Item ID'], item['Internal Code'], itemKey(item)].forEach(k => { if (clean(k)) byId.set(normalizeKey(k), item); });
      if (clean(item['Item Name'])) byName.set(normalizeKey(item['Item Name']), item);
    });
  }

  async function start() {
    injectStyles();
    try {
      await loadItems();
      enhanceCards();
      enhanceItemPage();
      const observer = new MutationObserver(() => {
        enhanceCards();
        enhanceItemPage();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (err) {
      console.warn('Bow marketplace enhancer could not load:', err);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
