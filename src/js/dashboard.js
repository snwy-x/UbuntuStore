// modulo de panel de control principal

// revisar que la sesion este activa
const currentUser = JSON.parse(sessionStorage.getItem('user'));
if (!currentUser) { 
  window.location.href = 'login.html'; 
} else if (currentUser.rol === 'Cliente') {
  window.location.href = 'index.html';
}

// alertas toast y modales
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
  };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-message">${message}</span><button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'slideOut 0.3s ease forwards'; setTimeout(() => toast.remove(), 300); }, 4000);
}

function openModal(title, bodyHTML, footerHTML = '', large = false) {
  const suffix = large ? 'Lg' : '';
  document.getElementById('modalTitle' + suffix).textContent = title;
  document.getElementById('modalBody' + suffix).innerHTML = bodyHTML;
  document.getElementById('modalFooter' + suffix).innerHTML = footerHTML;
  document.getElementById('modalOverlay' + suffix).classList.add('active');
}

function closeModal(large = false) {
  document.getElementById('modalOverlay' + (large ? 'Lg' : '')).classList.remove('active');
}

document.getElementById('modalClose').onclick = () => closeModal();
document.getElementById('modalCloseLg').onclick = () => closeModal(true);
document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
document.getElementById('modalOverlayLg').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(true); });

function formatCurrency(num) { return '$' + Number(num || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatDate(d) { if (!d) return '-'; return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
function formatDateTime(d) { if (!d) return '-'; return new Date(d).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

// mostrar datos del usuario logueado
document.getElementById('userName').textContent = currentUser.nombre;
document.getElementById('userRole').textContent = currentUser.rol;
document.getElementById('userAvatar').textContent = currentUser.nombre.charAt(0).toUpperCase();

// quitar opciones de admin si no lo es
if (currentUser.rol !== 'Administrador') {
  document.getElementById('adminSection').style.display = 'none';
}

// ocultar botones si es cliente
if (currentUser.rol === 'Cliente') {
  document.querySelectorAll('.nav-item').forEach(item => {
    const sec = item.dataset.section;
    if (sec !== 'sales-history' && sec !== 'workshop') {
      item.style.display = 'none';
    }
  });
  
  // renombrar textos segun el rol
  const salesNav = document.querySelector('.nav-item[data-section="sales-history"] span:last-child');
  if (salesNav) salesNav.textContent = 'Mis Compras';
  
  const workshopNav = document.querySelector('.nav-item[data-section="workshop"] span:last-child');
  if (workshopNav) workshopNav.textContent = 'Mis Reparaciones';
  
  document.querySelectorAll('.nav-section-title').forEach(title => {
    title.style.display = 'none';
  });
}

// boton de salir
document.getElementById('logoutBtn').onclick = () => {
  sessionStorage.removeItem('user');
  window.location.href = 'login.html';
};

// control del menu lateral
let currentSection = 'dashboard';
const navItems = document.querySelectorAll('.nav-item');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const section = item.dataset.section;
    if (item.dataset.role === 'admin' && currentUser.rol !== 'Administrador') return;
    navigateTo(section);
  });
});

function navigateTo(section) {
  currentSection = section;
  navItems.forEach(n => n.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-section="${section}"]`);
  if (activeNav) activeNav.classList.add('active');
  
  const titles = {
    'dashboard': 'Dashboard', 'pos': 'Punto de Venta', 'sales-history': currentUser.rol === 'Cliente' ? 'Mis Compras' : 'Historial de Ventas',
    'inventory': 'Inventario', 'workshop': currentUser.rol === 'Cliente' ? 'Mis Reparaciones' : 'Soporte Técnico', 'clients': 'Clientes',
    'suppliers': 'Proveedores', 'purchases': 'Compras', 'cash-report': 'Corte de Caja',
    'quoter': 'Cotizador de Ensambles', 'users': 'Administración de Usuarios', 'audit': 'Auditoría'
  };
  document.getElementById('pageTitle').innerHTML = titles[section] || section;
  loadSection(section);
}

async function loadSection(section) {
  const body = document.getElementById('contentBody');
  const actions = document.getElementById('headerActions');
  actions.innerHTML = '';
  
  switch(section) {
    case 'dashboard': await renderDashboard(body); break;
    case 'inventory': await renderInventory(body, actions); break;
    case 'pos': await renderPOS(body); break;
    case 'sales-history': await renderSalesHistory(body); break;
    case 'workshop': await renderWorkshop(body, actions); break;
    case 'clients': await renderClients(body, actions); break;
    case 'suppliers': await renderSuppliers(body, actions); break;
    case 'purchases': await renderPurchases(body, actions); break;
    case 'cash-report': await renderCashReport(body); break;
    case 'quoter': await renderQuoter(body); break;
    case 'users': await renderUsers(body, actions); break;
    case 'audit': await renderAudit(body); break;
    default: body.innerHTML = '<div class="empty-state"><div class="empty-icon">🚧</div><h3>En construcción</h3></div>';
  }
}

// renderizar las vistas del panel
async function renderDashboard(container) {
  container.innerHTML = '<div class="loading-overlay"><div class="loading-spinner"></div></div>';
  const res = await window.api.getStats();
  if (!res.success) { container.innerHTML = `<div class="empty-state"><h3>Error al cargar datos</h3><p>${res.message}</p></div>`; return; }
  const s = res.data;
  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-info">
          <p class="stat-label">Ventas del día</p>
          <h3 class="stat-value font-mono">${formatCurrency(s.ventasHoy.total)}</h3>
          <p class="stat-subtext">${s.ventasHoy.count} transacciones</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <p class="stat-label">Productos en Catálogo</p>
          <h3 class="stat-value font-mono">${s.productos}</h3>
          <p class="stat-subtext">Artículos registrados</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <p class="stat-label">Alertas de Stock</p>
          <h3 class="stat-value font-mono ${s.alertasStock > 0 ? 'low-stock' : ''}">${s.alertasStock}</h3>
          <p class="stat-subtext">Productos con stock bajo</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <p class="stat-label">Órdenes de Soporte</p>
          <h3 class="stat-value font-mono">${s.ordenesActivas}</h3>
          <p class="stat-subtext">Reparaciones activas</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <p class="stat-label">Clientes</p>
          <h3 class="stat-value font-mono">${s.clientes}</h3>
          <p class="stat-subtext">Clientes registrados</p>
        </div>
      </div>
    </div>
    <div class="table-container">
      <div class="table-toolbar">
        <h3>Productos con Stock Bajo</h3>
      </div>
      <div class="table-wrapper" id="lowStockTable"></div>
    </div>`;
  const low = await window.api.getLowStock();
  const badge = document.getElementById('lowStockBadge');
  if (low.success && low.data.length > 0) {
    badge.textContent = low.data.length; badge.style.display = 'inline';
    document.getElementById('lowStockTable').innerHTML = `<table class="data-table"><thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Stock</th><th>Mínimo</th></tr></thead><tbody>${low.data.map(p => `<tr><td><code>${p.codigo}</code></td><td>${p.nombre}</td><td>${p.categoria_nombre || '-'}</td><td class="low-stock font-mono">${p.stock_actual}</td><td class="font-mono">${p.stock_minimo}</td></tr>`).join('')}</tbody></table>`;
  } else {
    badge.style.display = 'none';
    document.getElementById('lowStockTable').innerHTML = '<div class="empty-state" style="padding:30px"><h3>Todo en orden</h3><p>No hay productos con stock bajo</p></div>';
  }
}

// cargar la vista de inicio al arrancar
navigateTo(currentUser.rol === 'Cliente' ? 'sales-history' : 'dashboard');
