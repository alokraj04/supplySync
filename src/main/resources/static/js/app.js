/**
 * SupplySync — app.js
 * Vanilla JS Dashboard for Product Inventory Management
 * Connects to: http://localhost:8080/api/products
 */

/* ============================================================
   CONFIG
   ============================================================ */
const API_BASE = 'http://localhost:8080/api/products';
const PAGE_SIZE = 10;
const LOW_STOCK_THRESHOLD = 10;

/* ============================================================
   STATE
   ============================================================ */
const state = {
  products: [],         // all products fetched from backend
  filtered: [],         // after search/filter/sort
  currentPage: 1,
  editingId: null,
  charts: {},
  activityLog: JSON.parse(localStorage.getItem('ss_activity') || '[]'),
  theme: localStorage.getItem('ss_theme') || 'dark',
};

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);
  fetchProducts();
  setupSearch();
  setupKeyboardShortcuts();
  renderActivityFeed();
  showShortcutHint();
});

/* ============================================================
   NAVIGATION
   ============================================================ */
function navigateTo(section, el) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show target section
  document.getElementById(`section-${section}`).classList.add('active');

  // Highlight nav
  if (el) {
    el.classList.add('active');
  } else {
    document.querySelector(`[data-section="${section}"]`)?.classList.add('active');
  }

  // Section-specific actions
  if (section === 'analytics') renderCharts();
  if (section === 'activity') renderActivityFeed();

  // Close sidebar on mobile
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');

  return false; // prevent default anchor behavior
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ============================================================
   THEME
   ============================================================ */
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(state.theme);
  localStorage.setItem('ss_theme', state.theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('theme-btn').textContent = theme === 'dark' ? '◑' : '○';
}

/* ============================================================
   API — Fetch Products
   ============================================================ */
async function fetchProducts() {
  try {
    showTableSkeleton();
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.products = await res.json();
    state.filtered = [...state.products];
    applyFilters();
    renderDashboard();
    updateHealthPill();
  } catch (err) {
    showToast('Failed to load products. Is the backend running?', 'error');
    document.getElementById('product-tbody').innerHTML =
      `<tr><td colspan="7" class="loading-cell">⚠ Could not connect to backend.</td></tr>`;
  }
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function renderDashboard() {
  const products = state.products;
  const total = products.length;
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= LOW_STOCK_THRESHOLD).length;
  const outOfStock = products.filter(p => p.quantity === 0).length;

  // Animate counters
  animateCounter('stat-total', total);
  animateCounter('stat-value', totalValue, '₹', true);
  animateCounter('stat-low', lowStock);
  animateCounter('stat-oos', outOfStock);

  // Health score
  const score = calcHealthScore(products);
  setHealthScore(score);

  // Category breakdown
  renderCategoryBreakdown();

  // Mini table
  renderMiniTable();
}

function animateCounter(id, target, prefix = '', isCurrency = false) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 800;
  const start = performance.now();
  const from = 0;

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out
    const val = from + (target - from) * ease;
    if (isCurrency) {
      el.textContent = prefix + formatCurrency(val);
    } else {
      el.textContent = prefix + Math.round(val);
    }
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function formatCurrency(val) {
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
  if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
  return val.toFixed(0);
}

function calcHealthScore(products) {
  if (!products.length) return 0;
  const oos = products.filter(p => p.quantity === 0).length;
  const low = products.filter(p => p.quantity > 0 && p.quantity <= LOW_STOCK_THRESHOLD).length;
  const oosRatio = oos / products.length;
  const lowRatio = low / products.length;
  const score = Math.max(0, Math.round(100 - (oosRatio * 60) - (lowRatio * 30)));
  return score;
}

function setHealthScore(score) {
  document.getElementById('health-score').textContent = score;
  const circumference = 326.7;
  const offset = circumference - (score / 100) * circumference;
  const ring = document.getElementById('ring-fill');
  ring.style.strokeDashoffset = offset;

  let color, status;
  if (score >= 80) { color = '#4ade80'; status = '✓ Excellent'; }
  else if (score >= 60) { color = '#60a5fa'; status = '◎ Good'; }
  else if (score >= 40) { color = '#fbbf24'; status = '⚠ Fair'; }
  else { color = '#f87171'; status = '✕ Critical'; }

  ring.style.stroke = color;
  document.getElementById('health-score').style.color = color;
  document.getElementById('health-status').textContent = status;
  document.getElementById('health-label').textContent = `Health: ${score}/100`;
}

function updateHealthPill() {
  const score = calcHealthScore(state.products);
  const dot = document.querySelector('.health-dot');
  if (score >= 80) dot.style.background = '#4ade80';
  else if (score >= 60) dot.style.background = '#60a5fa';
  else if (score >= 40) dot.style.background = '#fbbf24';
  else dot.style.background = '#f87171';
}

function renderCategoryBreakdown() {
  const cats = getCategoryMap();
  const total = state.products.length;
  const el = document.getElementById('category-breakdown');
  if (!total) { el.innerHTML = '<div style="color:var(--text-3);font-size:13px">No products yet.</div>'; return; }

  const colors = ['#4ade80','#60a5fa','#f59e0b','#f87171','#a78bfa','#34d399'];
  let html = '';
  let i = 0;
  for (const [cat, count] of Object.entries(cats)) {
    const pct = Math.round((count / total) * 100);
    const color = colors[i % colors.length];
    html += `
      <div class="cat-row">
        <div class="cat-meta">
          <span style="color:${color}">● ${cat}</span>
          <span>${count} items (${pct}%)</span>
        </div>
        <div class="cat-bar-bg">
          <div class="cat-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
      </div>`;
    i++;
  }
  el.innerHTML = html;
}

function getCategoryMap() {
  const map = {};
  state.products.forEach(p => {
    const cat = p.category || 'Uncategorized';
    map[cat] = (map[cat] || 0) + 1;
  });
  return map;
}

function renderMiniTable() {
  const recent = [...state.products].slice(0, 6);
  const wrap = document.getElementById('mini-table-wrap');
  if (!recent.length) { wrap.innerHTML = '<div class="empty-state">No products found.</div>'; return; }

  let rows = recent.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>₹${p.price.toFixed(2)}</td>
      <td>${p.quantity}</td>
      <td>${stockBadge(p.quantity)}</td>
    </tr>
  `).join('');

  wrap.innerHTML = `
    <table class="mini-table">
      <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Qty</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/* ============================================================
   PRODUCTS TABLE
   ============================================================ */
function renderTable() {
  const start = (state.currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const page = state.filtered.slice(start, end);

  const tbody = document.getElementById('product-tbody');

  if (!page.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="loading-cell">No products match your filters.</td></tr>`;
    document.getElementById('pagination').innerHTML = '';
    document.getElementById('table-footer').textContent = '';
    return;
  }

  const maxQty = Math.max(...state.products.map(p => p.quantity), 1);

  tbody.innerHTML = page.map((p, i) => {
    const globalIdx = start + i + 1;
    const qtyPct = Math.min((p.quantity / maxQty) * 100, 100);
    const barColor = p.quantity === 0 ? '#f87171' : p.quantity <= LOW_STOCK_THRESHOLD ? '#fbbf24' : '#4ade80';
    const rowClass = p.quantity === 0 ? 'risk-out-of-stock' : p.quantity <= LOW_STOCK_THRESHOLD ? 'risk-low-stock' : '';
    const emoji = getCategoryEmoji(p.category);

    return `<tr class="${rowClass}" data-id="${p.id}">
      <td style="color:var(--text-3);font-size:12px">${globalIdx}</td>
      <td>
        <div class="prod-name-cell">
          <div class="prod-avatar" style="background:var(--bg-3)">${emoji}</div>
          <div>
            <div class="prod-name">${escapeHtml(p.name)}</div>
            <div class="prod-desc">${escapeHtml(p.description || '—')}</div>
          </div>
        </div>
      </td>
      <td><span style="background:var(--bg-3);padding:3px 10px;border-radius:20px;font-size:11px">${escapeHtml(p.category)}</span></td>
      <td style="font-family:var(--font-display);font-weight:600">₹${p.price.toFixed(2)}</td>
      <td>
        <div class="qty-cell">
          <span>${p.quantity}</span>
          <div class="qty-bar-bg"><div class="qty-bar-fill" style="width:${qtyPct}%;background:${barColor}"></div></div>
        </div>
      </td>
      <td>${stockBadge(p.quantity)}</td>
      <td>
        <div class="action-btns">
          <button class="btn-table view" onclick="openPreview(${p.id})">👁 View</button>
          <button class="btn-table edit" onclick="openEditModal(${p.id})">✎ Edit</button>
          <button class="btn-table del" onclick="confirmDelete(${p.id}, '${escapeHtml(p.name)}')">✕ Del</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  renderPagination();
  document.getElementById('table-footer').textContent =
    `Showing ${start + 1}–${Math.min(end, state.filtered.length)} of ${state.filtered.length} products`;
}

function stockBadge(qty) {
  if (qty === 0) return `<span class="badge badge-out">● Out of Stock</span>`;
  if (qty <= LOW_STOCK_THRESHOLD) return `<span class="badge badge-low">● Low Stock</span>`;
  return `<span class="badge badge-in">● In Stock</span>`;
}

function getCategoryEmoji(cat) {
  if (!cat) return '📦';
  const c = cat.toLowerCase();
  if (c.includes('electron')) return '💻';
  if (c.includes('cloth') || c.includes('wear') || c.includes('apparel')) return '👕';
  if (c.includes('food') || c.includes('drink') || c.includes('bever')) return '🍎';
  if (c.includes('book') || c.includes('educat')) return '📚';
  if (c.includes('tool') || c.includes('hardware')) return '🔧';
  if (c.includes('sport') || c.includes('fitness')) return '⚽';
  if (c.includes('home') || c.includes('furni')) return '🏠';
  if (c.includes('health') || c.includes('medical')) return '💊';
  return '📦';
}

function renderPagination() {
  const total = state.filtered.length;
  const pages = Math.ceil(total / PAGE_SIZE);
  const cur = state.currentPage;
  const el = document.getElementById('pagination');

  if (pages <= 1) { el.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="goToPage(${cur - 1})" ${cur === 1 ? 'disabled' : ''}>‹</button>`;

  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= cur - 1 && i <= cur + 1)) {
      html += `<button class="page-btn ${i === cur ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    } else if (i === cur - 2 || i === cur + 2) {
      html += `<span style="color:var(--text-3);padding:0 4px">…</span>`;
    }
  }

  html += `<button class="page-btn" onclick="goToPage(${cur + 1})" ${cur === pages ? 'disabled' : ''}>›</button>`;
  el.innerHTML = html;
}

function goToPage(page) {
  const pages = Math.ceil(state.filtered.length / PAGE_SIZE);
  if (page < 1 || page > pages) return;
  state.currentPage = page;
  renderTable();
}

/* ============================================================
   FILTERS & SEARCH
   ============================================================ */
let searchDebounceTimer;

function setupSearch() {
  // Products page search
  document.getElementById('search-input').addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(applyFilters, 280);
  });
  document.getElementById('category-input').addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(applyFilters, 280);
  });
  document.getElementById('sort-select').addEventListener('change', applyFilters);
  document.getElementById('stock-filter').addEventListener('change', applyFilters);

  // Global topbar search — navigates to products and filters
  document.getElementById('global-search').addEventListener('input', (e) => {
    const val = e.target.value;
    document.getElementById('search-input').value = val;
    navigateTo('products', null);
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(applyFilters, 280);
  });
}

function applyFilters() {
  const search = document.getElementById('search-input').value.trim().toLowerCase();
  const cat = document.getElementById('category-input').value.trim().toLowerCase();
  const sort = document.getElementById('sort-select').value;
  const stockF = document.getElementById('stock-filter').value;

  let list = [...state.products];

  // Text search
  if (search) list = list.filter(p => p.name.toLowerCase().includes(search));

  // Category filter
  if (cat) list = list.filter(p => p.category?.toLowerCase().includes(cat));

  // Stock filter
  if (stockF === 'in')  list = list.filter(p => p.quantity > LOW_STOCK_THRESHOLD);
  if (stockF === 'low') list = list.filter(p => p.quantity > 0 && p.quantity <= LOW_STOCK_THRESHOLD);
  if (stockF === 'out') list = list.filter(p => p.quantity === 0);

  // Sort
  if (sort) {
    const [field, dir] = sort.split('-');
    list.sort((a, b) => {
      let av = a[field === 'qty' ? 'quantity' : field];
      let bv = b[field === 'qty' ? 'quantity' : field];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return dir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }

  state.filtered = list;
  state.currentPage = 1;
  renderTable();
}

function clearFilters() {
  document.getElementById('search-input').value = '';
  document.getElementById('category-input').value = '';
  document.getElementById('sort-select').value = '';
  document.getElementById('stock-filter').value = 'all';
  document.getElementById('global-search').value = '';
  state.filtered = [...state.products];
  state.currentPage = 1;
  renderTable();
}

/* ============================================================
   MODAL — ADD / EDIT
   ============================================================ */
function openAddModal() {
  state.editingId = null;
  document.getElementById('modal-title').textContent = 'Add Product';
  document.getElementById('modal-save-btn').textContent = 'Save Product';
  clearForm();
  document.getElementById('product-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('field-name').focus(), 100);
}

function openEditModal(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  state.editingId = id;
  document.getElementById('modal-title').textContent = 'Edit Product';
  document.getElementById('modal-save-btn').textContent = 'Update Product';
  document.getElementById('product-id').value = p.id;
  document.getElementById('field-name').value = p.name;
  document.getElementById('field-category').value = p.category;
  document.getElementById('field-price').value = p.price;
  document.getElementById('field-quantity').value = p.quantity;
  document.getElementById('field-description').value = p.description || '';
  document.getElementById('product-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('field-name').focus(), 100);
}

function closeProductModal() {
  document.getElementById('product-modal').classList.add('hidden');
  state.editingId = null;
  clearForm();
}

function clearForm() {
  ['product-id','field-name','field-category','field-price','field-quantity','field-description']
    .forEach(id => { document.getElementById(id).value = ''; });
}

async function saveProduct() {
  const name = document.getElementById('field-name').value.trim();
  const category = document.getElementById('field-category').value.trim();
  const price = parseFloat(document.getElementById('field-price').value);
  const quantity = parseInt(document.getElementById('field-quantity').value);
  const description = document.getElementById('field-description').value.trim();

  // Validation
  if (!name)            { showToast('Product name is required.', 'warning'); return; }
  if (!category)        { showToast('Category is required.', 'warning'); return; }
  if (isNaN(price) || price < 0) { showToast('Enter a valid price.', 'warning'); return; }
  if (isNaN(quantity) || quantity < 0) { showToast('Enter a valid quantity.', 'warning'); return; }

  const payload = { name, category, price, quantity, description };
  const btn = document.getElementById('modal-save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    let res, saved;
    if (state.editingId) {
      // UPDATE
      res = await fetch(`${API_BASE}/${state.editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      saved = await res.json();
      logActivity(`Updated product: ${saved.name}`, 'edit');
      showToast(`"${saved.name}" updated successfully.`, 'success');
    } else {
      // CREATE
      res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      saved = await res.json();
      logActivity(`Added new product: ${saved.name}`, 'create');
      showToast(`"${saved.name}" added to inventory.`, 'success');
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    closeProductModal();
    await fetchProducts();
  } catch (err) {
    showToast('Operation failed. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = state.editingId ? 'Update Product' : 'Save Product';
  }
}

/* ============================================================
   MODAL — DELETE CONFIRM
   ============================================================ */
let pendingDeleteId = null;

function confirmDelete(id, name) {
  pendingDeleteId = id;
  document.getElementById('confirm-title').textContent = 'Delete Product?';
  document.getElementById('confirm-message').textContent = `"${name}" will be permanently removed from inventory.`;
  document.getElementById('confirm-ok-btn').onclick = () => deleteProduct(id, name);
  document.getElementById('confirm-modal').classList.remove('hidden');
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.add('hidden');
  pendingDeleteId = null;
}

async function deleteProduct(id, name) {
  closeConfirmModal();
  try {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    logActivity(`Deleted product: ${name}`, 'delete');
    showToast(`"${name}" removed from inventory.`, 'info');
    await fetchProducts();
  } catch {
    showToast('Delete failed. Please try again.', 'error');
  }
}

/* ============================================================
   MODAL — QUICK PREVIEW
   ============================================================ */
function openPreview(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;

  const totalVal = (p.price * p.quantity).toFixed(2);
  document.getElementById('preview-content').innerHTML = `
    <div style="text-align:center;padding:16px 0 8px">
      <div style="font-size:48px;margin-bottom:8px">${getCategoryEmoji(p.category)}</div>
      <div style="font-family:var(--font-display);font-size:20px;font-weight:700">${escapeHtml(p.name)}</div>
      <div style="margin-top:8px">${stockBadge(p.quantity)}</div>
    </div>
    <div class="preview-field"><span class="preview-field-label">ID</span><span class="preview-field-val">#${p.id}</span></div>
    <div class="preview-field"><span class="preview-field-label">Category</span><span class="preview-field-val">${escapeHtml(p.category)}</span></div>
    <div class="preview-field"><span class="preview-field-label">Price</span><span class="preview-field-val" style="font-family:var(--font-display);font-weight:600">₹${p.price.toFixed(2)}</span></div>
    <div class="preview-field"><span class="preview-field-label">Quantity</span><span class="preview-field-val">${p.quantity} units</span></div>
    <div class="preview-field"><span class="preview-field-label">Total Value</span><span class="preview-field-val" style="color:var(--accent);font-weight:600">₹${totalVal}</span></div>
    <div class="preview-field"><span class="preview-field-label">Description</span><span class="preview-field-val" style="max-width:240px">${escapeHtml(p.description || '—')}</span></div>
  `;
  document.getElementById('preview-edit-btn').onclick = () => {
    closePreviewModal();
    openEditModal(id);
  };
  document.getElementById('preview-modal').classList.remove('hidden');
}

function closePreviewModal() {
  document.getElementById('preview-modal').classList.add('hidden');
}

/* ============================================================
   CHARTS
   ============================================================ */
function renderCharts() {
  const cats = getCategoryMap();
  const catLabels = Object.keys(cats);
  const catCounts = Object.values(cats);

  // Destroy existing charts
  Object.values(state.charts).forEach(c => c.destroy());
  state.charts = {};

  const palette = ['#4ade80','#60a5fa','#f59e0b','#f87171','#a78bfa','#34d399','#fb923c'];
  const isDark = state.theme === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#8b90a0' : '#555b6e';

  // Chart defaults
  Chart.defaults.color = textColor;
  Chart.defaults.font.family = 'DM Sans';

  // 1. Category distribution (Doughnut)
  const ctx1 = document.getElementById('chart-category');
  state.charts.cat = new Chart(ctx1, {
    type: 'doughnut',
    data: {
      labels: catLabels,
      datasets: [{ data: catCounts, backgroundColor: palette, borderWidth: 2, borderColor: isDark ? '#111318' : '#fff' }]
    },
    options: {
      cutout: '65%',
      plugins: { legend: { position: 'bottom', labels: { padding: 16, boxWidth: 12 } } }
    }
  });

  // 2. Stock by category (Bar)
  const catStock = {};
  state.products.forEach(p => {
    const cat = p.category || 'Other';
    catStock[cat] = (catStock[cat] || 0) + p.quantity;
  });
  const ctx2 = document.getElementById('chart-stock');
  state.charts.stock = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: Object.keys(catStock),
      datasets: [{
        label: 'Total Quantity',
        data: Object.values(catStock),
        backgroundColor: palette,
        borderRadius: 6,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor } },
        y: { grid: { color: gridColor }, beginAtZero: true }
      }
    }
  });

  // 3. Risk chart — Low stock vs In Stock per category (Stacked bar)
  const catIn = {}, catLow = {}, catOut = {};
  state.products.forEach(p => {
    const cat = p.category || 'Other';
    if (p.quantity === 0) catOut[cat] = (catOut[cat] || 0) + 1;
    else if (p.quantity <= LOW_STOCK_THRESHOLD) catLow[cat] = (catLow[cat] || 0) + 1;
    else catIn[cat] = (catIn[cat] || 0) + 1;
  });
  const allCats = [...new Set(state.products.map(p => p.category || 'Other'))];
  const ctx3 = document.getElementById('chart-risk');
  state.charts.risk = new Chart(ctx3, {
    type: 'bar',
    data: {
      labels: allCats,
      datasets: [
        { label: 'In Stock', data: allCats.map(c => catIn[c] || 0), backgroundColor: '#4ade80', borderRadius: 4 },
        { label: 'Low Stock', data: allCats.map(c => catLow[c] || 0), backgroundColor: '#fbbf24', borderRadius: 4 },
        { label: 'Out of Stock', data: allCats.map(c => catOut[c] || 0), backgroundColor: '#f87171', borderRadius: 4 },
      ]
    },
    options: {
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { stacked: true, grid: { color: gridColor } },
        y: { stacked: true, grid: { color: gridColor }, beginAtZero: true }
      }
    }
  });
}

/* ============================================================
   ACTIVITY LOG
   ============================================================ */
function logActivity(message, type = 'info') {
  const entry = { message, type, timestamp: new Date().toISOString() };
  state.activityLog.unshift(entry);
  if (state.activityLog.length > 50) state.activityLog = state.activityLog.slice(0, 50);
  localStorage.setItem('ss_activity', JSON.stringify(state.activityLog));
  renderActivityFeed();
}

function renderActivityFeed() {
  const feed = document.getElementById('activity-feed');
  if (!state.activityLog.length) {
    feed.innerHTML = '<div class="empty-state">No activity yet. Start by adding or modifying products.</div>';
    return;
  }

  const dotColors = { create: '#4ade80', edit: '#60a5fa', delete: '#f87171', info: '#8b90a0' };

  feed.innerHTML = state.activityLog.map(entry => {
    const color = dotColors[entry.type] || '#8b90a0';
    const time = formatRelativeTime(new Date(entry.timestamp));
    return `
      <div class="activity-item">
        <div class="activity-dot" style="background:${color}"></div>
        <div class="activity-content">
          <div class="activity-text">${escapeHtml(entry.message)}</div>
          <div class="activity-time">${time}</div>
        </div>
      </div>`;
  }).join('');
}

function clearActivity() {
  state.activityLog = [];
  localStorage.removeItem('ss_activity');
  renderActivityFeed();
  showToast('Activity feed cleared.', 'info');
}

function formatRelativeTime(date) {
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

/* ============================================================
   EXPORT TO CSV
   ============================================================ */
function exportToCSV() {
  if (!state.products.length) { showToast('No products to export.', 'warning'); return; }
  const headers = ['ID', 'Name', 'Category', 'Price', 'Quantity', 'Description'];
  const rows = state.products.map(p => [
    p.id,
    `"${(p.name || '').replace(/"/g, '""')}"`,
    `"${(p.category || '').replace(/"/g, '""')}"`,
    p.price,
    p.quantity,
    `"${(p.description || '').replace(/"/g, '""')}"`
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `supplysync-products-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  logActivity('Exported products to CSV', 'info');
  showToast(`Exported ${state.products.length} products to CSV.`, 'success');
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'k':
          e.preventDefault();
          document.getElementById('global-search').focus();
          break;
        case 'n':
          e.preventDefault();
          openAddModal();
          break;
        case 'e':
          e.preventDefault();
          exportToCSV();
          break;
      }
    }
    if (e.key === 'Escape') {
      closeProductModal();
      closeConfirmModal();
      closePreviewModal();
    }
  });
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
function showToast(message, type = 'info') {
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/* ============================================================
   SKELETON LOADER
   ============================================================ */
function showTableSkeleton() {
  const tbody = document.getElementById('product-tbody');
  tbody.innerHTML = Array(6).fill(0).map(() => `
    <tr>
      <td><div class="skeleton" style="height:16px;width:24px"></div></td>
      <td><div class="skeleton" style="height:16px;width:160px"></div></td>
      <td><div class="skeleton" style="height:16px;width:80px"></div></td>
      <td><div class="skeleton" style="height:16px;width:60px"></div></td>
      <td><div class="skeleton" style="height:16px;width:40px"></div></td>
      <td><div class="skeleton" style="height:20px;width:80px;border-radius:20px"></div></td>
      <td><div class="skeleton" style="height:28px;width:120px"></div></td>
    </tr>
  `).join('');
}

/* ============================================================
   SHORTCUT HINT
   ============================================================ */
function showShortcutHint() {
  const hint = document.getElementById('shortcut-hint');
  setTimeout(() => { hint.style.opacity = '1'; }, 1500);
  setTimeout(() => { hint.style.opacity = '0'; }, 5000);
}

/* ============================================================
   UTILITIES
   ============================================================ */
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}