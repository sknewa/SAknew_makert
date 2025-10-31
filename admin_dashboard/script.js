const API_BASE = 'https://saknew-makert-e7ac1361decc.herokuapp.com/api';

async function fetchData(endpoint) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}

function showSection(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`${section}-section`).classList.add('active');
    event.target.classList.add('active');
    
    const titles = {
        overview: 'Dashboard Overview',
        users: 'User Management',
        shops: 'Shop Management',
        transactions: 'Transactions',
        feedback: 'User Feedback'
    };
    document.getElementById('page-title').textContent = titles[section];
}

async function loadOverview() {
    const stats = await fetchData('/admin/stats/');
    
    if (stats) {
        document.getElementById('total-users').textContent = stats.users || 0;
        document.getElementById('total-shops').textContent = stats.shops || 0;
        document.getElementById('total-transactions').textContent = stats.orders || 0;
        document.getElementById('total-revenue').textContent = `R ${stats.revenue.toFixed(2)}`;
    }
}

async function loadUsers() {
    const users = await fetchData('/admin/users/');
    const tbody = document.getElementById('users-table-body');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.slice(0, 50).map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${user.email}</td>
            <td>${user.first_name || ''} ${user.last_name || ''}</td>
            <td>${user.is_staff ? 'Admin' : (user.shop_slug ? 'Seller' : 'Buyer')}</td>
            <td>${new Date(user.date_joined).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

async function loadShops() {
    const shops = await fetchData('/admin/shops/');
    const tbody = document.getElementById('shops-table-body');
    
    if (!shops || shops.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No shops found</td></tr>';
        return;
    }
    
    tbody.innerHTML = shops.slice(0, 50).map(shop => `
        <tr>
            <td>${shop.id}</td>
            <td>${shop.name}</td>
            <td>${shop.owner?.email || 'N/A'}</td>
            <td>${shop.products?.length || 0}</td>
            <td>${new Date(shop.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

async function loadTransactions() {
    const orders = await fetchData('/admin/orders/');
    const tbody = document.getElementById('transactions-table-body');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No transactions found</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.slice(0, 50).map(order => `
        <tr>
            <td>#${order.id}</td>
            <td>${order.user?.email || 'N/A'}</td>
            <td>R ${parseFloat(order.total_amount || 0).toFixed(2)}</td>
            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
            <td>${new Date(order.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

async function loadFeedback() {
    const reviews = await fetchData('/admin/reviews/');
    const container = document.getElementById('feedback-container');
    
    if (!reviews || reviews.length === 0) {
        container.innerHTML = '<p>No feedback available</p>';
        return;
    }
    
    container.innerHTML = reviews.slice(0, 20).map(review => `
        <div class="feedback-card">
            <div class="feedback-header">
                <div class="feedback-rating">${'⭐'.repeat(review.rating)}</div>
                <div>${new Date(review.created_at).toLocaleDateString()}</div>
            </div>
            <div class="feedback-text">${review.comment || 'No comment'}</div>
            <div class="feedback-user">By: ${review.user?.username || 'Anonymous'}</div>
        </div>
    `).join('');
}

async function refreshData() {
    document.getElementById('refresh-btn').disabled = true;
    await Promise.all([
        loadOverview(),
        loadUsers(),
        loadShops(),
        loadTransactions(),
        loadFeedback()
    ]);
    document.getElementById('refresh-btn').disabled = false;
}

window.onload = refreshData;
