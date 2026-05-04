const API = 'https://saknew-market-backend-f8738ecec7fa.herokuapp.com';
let token = localStorage.getItem('admin_token') || '';

// ── AUTH ──────────────────────────────────────────────────────
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-error');

  err.classList.add('hidden');
  if (!email || !password) { showErr('Please enter email and password.'); return; }

  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    const res = await fetch(`${API}/api/admin/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) { showErr(data.error || 'Login failed.'); return; }

    token = data.access;
    localStorage.setItem('admin_token', token);
    document.getElementById('admin-name').textContent = data.admin?.email || 'Admin';
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    loadAll();
  } catch {
    showErr('Cannot connect to server.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

function showErr(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function doLogout() {
  localStorage.removeItem('admin_token');
  token = '';
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
}

// Allow Enter key on login
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
  // Auto-login if token exists
  if (token) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    loadAll();
  }
});

// ── API HELPER ────────────────────────────────────────────────
async function api(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (res.status === 401) { doLogout(); return null; }
  return res.json();
}

// ── NAVIGATION ────────────────────────────────────────────────
function show(name, el) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`sec-${name}`).classList.add('active');
  el.classList.add('active');
  const titles = {
    overview: 'Overview', users: 'User Management', shops: 'Shop Management',
    products: 'Products', orders: 'Orders', transactions: 'Transactions',
    withdrawals: 'Withdrawal Requests', feedback: 'User Feedback'
  };
  document.getElementById('page-title').textContent = titles[name] || name;
}

// ── LOAD ALL ──────────────────────────────────────────────────
async function loadAll() {
  document.getElementById('last-updated').textContent = 'Refreshing...';
  await Promise.all([
    loadStats(), loadUsers(), loadShops(), loadProducts(),
    loadOrders(), loadTransactions(), loadWithdrawals(), loadFeedback()
  ]);
  document.getElementById('last-updated').textContent =
    'Last updated: ' + new Date().toLocaleTimeString();
}

// ── STATS ─────────────────────────────────────────────────────
async function loadStats() {
  const d = await api('/api/admin/stats/');
  if (!d) return;

  set('s-users', d.users.total);
  set('s-users-sub', `+${d.users.new_today} today · +${d.users.new_this_week} this week`);
  set('s-revenue', `R${fmt(d.revenue.total)}`);
  set('s-revenue-sub', `R${fmt(d.revenue.today)} today · R${fmt(d.revenue.this_week)} this week`);
  set('s-orders', d.orders.total);
  set('s-orders-sub', `${d.orders.today} today · ${d.orders.this_week} this week`);
  set('s-shops', d.shops.active);
  set('s-shops-sub', `${d.shops.total} total shops`);
  set('s-wallet', `R${fmt(d.wallet.total_balance)}`);
  set('s-wallet-sub', `R${fmt(d.wallet.total_deposits)} total deposits`);
  set('s-withdrawals', d.wallet.pending_withdrawals);
  set('s-withdrawals-sub', `R${fmt(d.wallet.pending_withdrawal_amount)} pending`);
  set('s-products', d.products.active);
  set('s-products-sub', `${d.products.out_of_stock} out of stock`);
  set('s-pending', d.orders.pending);
  set('s-pending-sub', `${d.orders.processing} processing`);

  set('rev-today', `R${fmt(d.revenue.today)}`);
  set('rev-week', `R${fmt(d.revenue.this_week)}`);
  set('rev-month', `R${fmt(d.revenue.this_month)}`);
  set('rev-total', `R${fmt(d.revenue.total)}`);

  set('usr-today', `+${d.users.new_today}`);
  set('usr-week', `+${d.users.new_this_week}`);
  set('usr-month', `+${d.users.new_this_month}`);
  set('usr-sellers', d.users.sellers);

  set('inv-total', d.products.total);
  set('inv-active', d.products.active);
  set('inv-oos', d.products.out_of_stock);
  set('inv-val', `R${fmt(d.products.total_stock_value)}`);

  set('ord-pending', d.orders.pending);
  set('ord-processing', d.orders.processing);
  set('ord-completed', d.orders.completed);
  set('ord-cancelled', d.orders.cancelled);
}

// ── USERS ─────────────────────────────────────────────────────
async function loadUsers() {
  const data = await api('/api/admin/users/');
  const tbody = document.getElementById('users-tbody');
  if (!data) return;
  tbody.innerHTML = data.map(u => `
    <tr>
      <td>${u.id}</td>
      <td>${u.email}</td>
      <td>${u.first_name || ''} ${u.last_name || ''}</td>
      <td>${badge(u.is_staff ? 'Admin' : u.is_seller ? 'Seller' : 'Buyer',
           u.is_staff ? 'purple' : u.is_seller ? 'blue' : 'gray')}</td>
      <td>${badge(u.email_verified ? 'Verified' : 'Unverified',
           u.email_verified ? 'green' : 'yellow')}</td>
      <td>${fmtDate(u.date_joined)}</td>
    </tr>`).join('') || '<tr><td colspan="6" class="loading">No users found</td></tr>';
}

// ── SHOPS ─────────────────────────────────────────────────────
async function loadShops() {
  const data = await api('/api/admin/shops/');
  const tbody = document.getElementById('shops-tbody');
  if (!data) return;
  tbody.innerHTML = data.map(s => `
    <tr>
      <td>${s.id}</td>
      <td><strong>${s.name}</strong></td>
      <td>${s.owner}</td>
      <td>${s.product_count}</td>
      <td>${s.active_products}</td>
      <td>${s.out_of_stock > 0 ? `<span style="color:#EF4444;font-weight:700">${s.out_of_stock}</span>` : '0'}</td>
      <td>${fmtDate(s.created_at)}</td>
    </tr>`).join('') || '<tr><td colspan="7" class="loading">No shops found</td></tr>';
}

// ── PRODUCTS ──────────────────────────────────────────────────
async function loadProducts() {
  const data = await api('/api/admin/products/');
  const tbody = document.getElementById('products-tbody');
  if (!data) return;
  tbody.innerHTML = data.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>${p.name}</td>
      <td>${p.shop}</td>
      <td>${p.category}</td>
      <td>R${fmt(p.price)}</td>
      <td>${p.stock === 0 ? badge('Out of Stock','red') : p.stock <= 5 ? badge(`Low: ${p.stock}`,'yellow') : p.stock}</td>
      <td>${badge(p.is_active ? 'Active' : 'Inactive', p.is_active ? 'green' : 'gray')}</td>
    </tr>`).join('') || '<tr><td colspan="7" class="loading">No products found</td></tr>';
}

// ── ORDERS ────────────────────────────────────────────────────
async function loadOrders() {
  const data = await api('/api/admin/orders/');
  const tbody = document.getElementById('orders-tbody');
  if (!data) return;
  const statusColor = { pending:'yellow', processing:'blue', completed:'green', cancelled:'red', delivered:'purple' };
  tbody.innerHTML = data.map(o => `
    <tr>
      <td><code style="font-size:11px">#${o.id.slice(-8).toUpperCase()}</code></td>
      <td>${o.user}</td>
      <td>${badge(o.is_guest ? 'Guest' : 'Member', o.is_guest ? 'yellow' : 'blue')}</td>
      <td><strong>R${fmt(o.total)}</strong></td>
      <td>${badge(o.order_status, statusColor[o.order_status] || 'gray')}</td>
      <td>${badge(o.payment_status, o.payment_status === 'Completed' ? 'green' : 'yellow')}</td>
      <td>${fmtDate(o.date)}</td>
    </tr>`).join('') || '<tr><td colspan="7" class="loading">No orders found</td></tr>';
}

// ── TRANSACTIONS ──────────────────────────────────────────────
async function loadTransactions() {
  const data = await api('/api/admin/transactions/');
  const tbody = document.getElementById('transactions-tbody');
  if (!data) return;
  const typeColor = { DEPOSIT:'green', WITHDRAWAL:'red', PAYMENT:'blue', ESCROW_RELEASE:'purple', REFUND:'yellow' };
  tbody.innerHTML = data.map(t => `
    <tr>
      <td>${t.id}</td>
      <td>${t.user}</td>
      <td>${badge(t.type, typeColor[t.type] || 'gray')}</td>
      <td><strong>R${fmt(Math.abs(t.amount))}</strong></td>
      <td>${badge(t.status, t.status === 'COMPLETED' ? 'green' : t.status === 'PENDING' ? 'yellow' : 'red')}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:#64748B">${t.description}</td>
      <td>${fmtDate(t.date)}</td>
    </tr>`).join('') || '<tr><td colspan="7" class="loading">No transactions found</td></tr>';
}

// ── WITHDRAWALS ───────────────────────────────────────────────
async function loadWithdrawals() {
  const data = await api('/api/admin/withdrawals/');
  const tbody = document.getElementById('withdrawals-tbody');
  if (!data) return;
  tbody.innerHTML = data.map(w => `
    <tr>
      <td>${w.id}</td>
      <td>${w.user}</td>
      <td><strong>R${fmt(w.amount)}</strong></td>
      <td>${badge(w.status, w.status === 'COMPLETED' ? 'green' : w.status === 'PENDING' ? 'yellow' : 'red')}</td>
      <td style="max-width:220px;font-size:11px;color:#64748B;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${w.description}">${w.description}</td>
      <td>${fmtDate(w.date)}</td>
      <td>
        ${w.status === 'PENDING' ? `
          <button class="btn-approve" onclick="processWithdrawal(${w.id},'approve')">✓ Approve</button>
          <button class="btn-reject" onclick="processWithdrawal(${w.id},'reject')">✗ Reject</button>
        ` : '—'}
      </td>
    </tr>`).join('') || '<tr><td colspan="7" class="loading">No withdrawal requests</td></tr>';
}

async function processWithdrawal(id, action) {
  const note = action === 'reject' ? prompt('Reason for rejection (optional):') : null;
  if (action === 'reject' && note === null) return; // cancelled

  const confirmed = confirm(`${action === 'approve' ? 'Approve' : 'Reject'} withdrawal #${id}?`);
  if (!confirmed) return;

  try {
    const res = await fetch(`${API}/api/wallet/withdrawals/${id}/process/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note: note || '' })
    });
    const data = await res.json();
    alert(data.detail || 'Done.');
    loadWithdrawals();
    loadStats();
  } catch {
    alert('Failed to process withdrawal.');
  }
}

// ── FEEDBACK ──────────────────────────────────────────────────
async function loadFeedback() {
  const data = await api('/api/admin/feedback/');
  const grid = document.getElementById('feedback-grid');
  if (!data || data.length === 0) {
    grid.innerHTML = '<p class="loading">No feedback yet.</p>';
    return;
  }
  grid.innerHTML = data.map(f => `
    <div class="fb-card">
      <div class="fb-header">
        <span class="fb-sender">${f.sender}</span>
        <span class="fb-date">${fmtDate(f.date)}</span>
      </div>
      <p class="fb-text">${f.feedback}</p>
      ${f.sender !== 'Anonymous'
        ? `<span class="fb-shop">🏪 ${f.sender}</span>`
        : `<span class="fb-anon">Anonymous</span>`}
    </div>`).join('');
}

// ── SEARCH ────────────────────────────────────────────────────
function filterTable(tbodyId, inputId) {
  const q = document.getElementById(inputId).value.toLowerCase();
  const rows = document.getElementById(tbodyId).querySelectorAll('tr');
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

// ── HELPERS ───────────────────────────────────────────────────
function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function fmt(n) {
  return parseFloat(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}
function badge(text, color) {
  return `<span class="badge badge-${color}">${text}</span>`;
}
