(function () {
  'use strict';

  const cfg = window.STORE_CONFIG || {};
  const defaultImage = '../' + (cfg.defaultImage || 'assets/placeholders/no-image.svg');

  function rawValue(item, name) {
    if (!item) return '';
    if (item.raw && Object.prototype.hasOwnProperty.call(item.raw, name)) return item.raw[name];
    if (Object.prototype.hasOwnProperty.call(item, name)) return item[name];

    const map = {
      'Item ID': 'itemId',
      'Item Name': 'name',
      'Category': 'category',
      'Item Value': 'itemValue',
      'Description': 'description',
      'Sale Price': 'salePriceRaw',
      'Internal Code': 'internalCode',
      'Available': 'availableStatus',
      'Image URLs': 'images',
      'Amazon Link': 'amazonLink',
      'Date Added': 'dateAdded',
      'Last Updated': 'lastUpdated',
      'Notes': 'notes',
      'Discount': 'discount',
      'Barcode': 'barcode'
    };
    const key = map[name];
    return key ? item[key] : '';
  }

  function text(value) {
    if (Array.isArray(value)) return value.join(', ');
    return String(value ?? '').trim();
  }

  function money(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const n = Number(String(value || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  function discountPercent(item) {
    const raw = text(rawValue(item, 'Discount'));
    const fromRaw = Number(raw.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(fromRaw) && fromRaw > 0) return Math.round(fromRaw);

    const value = money(rawValue(item, 'Item Value'));
    const sale = money(rawValue(item, 'Sale Price'));
    if (!value || !sale || sale >= value) return 0;
    return Math.round(((value - sale) / value) * 100);
  }

  function parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function imageFor(item) {
    const images = rawValue(item, 'Image URLs');
    if (Array.isArray(images) && images.length) return images[0];
    const raw = text(images).split(',').map(x => x.trim()).filter(Boolean)[0];
    return raw || defaultImage;
  }

  function isSold(item) {
    return text(rawValue(item, 'Available')).toLowerCase() === 'sold';
  }

  function isOrdered(item) {
    const status = text(rawValue(item, 'Available')).toLowerCase();
    return status === 'ordered' || status === 'processing';
  }

  function isNewArrival(item) {
    if (isOrdered(item)) return true;
    const d = parseDate(rawValue(item, 'Date Added'));
    if (!d) return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return d >= cutoff;
  }

  function itemUrl(item) {
    const id = encodeURIComponent(text(rawValue(item, 'Item ID')) || text(rawValue(item, 'Internal Code')) || text(rawValue(item, 'Item Name')) || '');
    return `item.html?id=${id}`;
  }

  function priceBlock(item) {
    const saleRaw = text(rawValue(item, 'Sale Price'));
    const sale = money(saleRaw);
    const value = money(rawValue(item, 'Item Value'));
    const discount = discountPercent(item);
    if (sale) {
      return `<div class="price-row"><strong>$${sale.toFixed(2)}</strong>${value ? `<span class="muted-price">Value $${value.toFixed(2)}</span>` : ''}</div>${discount ? `<span class="deal-badge">${discount}% off</span>` : ''}`;
    }
    if (value) return `<div class="price-row"><strong>$${value.toFixed(2)}</strong></div>`;
    return '<div class="price-row"><strong>Contact for price</strong></div>';
  }

  function card(item, options = {}) {
    const discount = discountPercent(item);
    const dateAdded = rawValue(item, 'Date Added') ? `<small>Added ${escapeHtml(rawValue(item, 'Date Added'))}</small>` : '';
    const statusText = text(rawValue(item, 'Available'));
    const status = statusText ? `<small>Status: ${escapeHtml(statusText)}</small>` : '';
    const icText = text(rawValue(item, 'Internal Code'));
    const ic = icText ? `<span class="bow-ic-line">IC: ${escapeHtml(icText)}</span>` : '';
    const highlight = options.showDiscount && discount ? `<div class="bow-extra-ribbon">${discount}% OFF</div>` : '';
    return `
      <article class="product-card bow-extra-card">
        <a href="${itemUrl(item)}" class="product-image-wrap">
          ${highlight}
          <img src="${escapeHtml(imageFor(item))}" alt="${escapeHtml(rawValue(item, 'Item Name') || 'Marketplace item')}" loading="lazy" onerror="this.src='${defaultImage}'">
        </a>
        <div class="product-info">
          <p class="eyebrow">${escapeHtml(rawValue(item, 'Category') || 'Marketplace')}</p>
          <h3><a href="${itemUrl(item)}">${escapeHtml(rawValue(item, 'Item Name') || 'Untitled Item')}</a></h3>
          ${ic}
          ${priceBlock(item)}
          <div class="mini-meta">${dateAdded}${status}</div>
          <a class="secondary-btn small-btn" href="${itemUrl(item)}">View Item</a>
        </div>
      </article>`;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function loadItems() {
    if (window.BowStore && typeof window.BowStore.fetchItems === 'function') {
      return await window.BowStore.fetchItems();
    }

    const sheetId = encodeURIComponent(cfg.sheetId || '');
    const sheetName = encodeURIComponent(cfg.sheetName || 'Inventory');
    const urls = [
      `https://opensheet.elk.sh/${sheetId}/${sheetName}`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`
    ];

    let lastError = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Could not load sheet data: ${res.status}`);
        const textBody = await res.text();
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json') || textBody.trim().startsWith('[')) return JSON.parse(textBody);
        return csvToObjects(textBody);
      } catch (err) {
        console.warn('BowMarketplaceExtra sheet source failed:', url, err);
        lastError = err;
      }
    }
    throw lastError || new Error('Could not load sheet data');
  }

  function csvToObjects(csvText) {
    const rows = parseCSV(csvText);
    if (!rows.length) return [];
    const headers = rows[0].map(h => String(h || '').trim());
    return rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => obj[header] = row[index] || '');
      return obj;
    });
  }

  function parseCSV(textBody) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < textBody.length; i++) {
      const char = textBody[i];
      const next = textBody[i + 1];
      if (char === '"') {
        if (inQuotes && next === '"') { cell += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(cell); cell = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') i++;
        row.push(cell);
        if (row.some(x => String(x).trim() !== '')) rows.push(row);
        row = []; cell = '';
      } else {
        cell += char;
      }
    }
    row.push(cell);
    if (row.some(x => String(x).trim() !== '')) rows.push(row);
    return rows;
  }

  window.BowMarketplaceExtra = {
    loadItems,
    card,
    discountPercent,
    isNewArrival,
    isSold,
    isOrdered,
    parseDate
  };
})();
