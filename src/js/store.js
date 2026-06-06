// modulo de tienda online

let storeCart = JSON.parse(localStorage.getItem('storeCart')) || [];
let currentUser = JSON.parse(sessionStorage.getItem('user')) || null;

document.addEventListener('DOMContentLoaded', async () => {
  // eventos para abrir y cerrar el carrito
  const cartToggleBtn = document.getElementById('cartToggleBtn');
  const closeCartBtn = document.getElementById('closeCartBtn');
  const cartDrawer = document.getElementById('cartDrawer');

  if (cartToggleBtn && cartDrawer) {
    cartToggleBtn.addEventListener('click', () => {
      cartDrawer.classList.add('open');
    });
  }

  if (closeCartBtn && cartDrawer) {
    closeCartBtn.addEventListener('click', () => {
      cartDrawer.classList.remove('open');
    });
  }

  // menu desplegable
  setupSessionNavbar();

  // cargar categorias y productos si existen en la pagina
  if (document.getElementById('storeCategory')) {
    await loadStoreCategories();
  }
  if (document.getElementById('storeProductsGrid')) {
    await loadStoreProducts();
  }
  if (document.getElementById('cartDrawerBody')) {
    renderStoreCart();
  }
});

// menu de navegacion del usuario
function setupSessionNavbar() {
  const container = document.getElementById('navSessionContainer');
  if (!container) return;

  if (currentUser) {
    // menu personalizado del usuario logueado
    const isStaff = currentUser.rol === 'Administrador' || currentUser.rol === 'Vendedor';
    container.innerHTML = `
      <div class="dropdown">
        <button class="btn btn-secondary btn-sm" id="userMenuBtn" style="padding:6px 16px; display:flex; align-items:center; gap:8px;">
          <span style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            Hola, ${currentUser.nombre.split(' ')[0]}
          </span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:10px;height:10px;"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div class="dropdown-menu" id="userMenuDropdown">
          <div class="dropdown-item" onclick="handleHistoryNavigation('compras')">Mis Compras</div>
          <div class="dropdown-item" onclick="handleHistoryNavigation('reparaciones')">Mis Reparaciones</div>
          ${isStaff ? `
            <div class="dropdown-divider"></div>
            <a href="dashboard.html" class="dropdown-item" style="text-decoration:none;">Panel de Control</a>
          ` : ''}
          <div class="dropdown-divider"></div>
          <div class="dropdown-item danger" onclick="handleStoreLogout(event)">Cerrar Sesión</div>
        </div>
      </div>
    `;

    // click para mostrar menu
    const btn = document.getElementById('userMenuBtn');
    const menu = document.getElementById('userMenuDropdown');
    
    if (btn && menu) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('show');
      });

      // cerrar si hace click afuera
      document.addEventListener('click', () => {
        menu.classList.remove('show');
      });
    }
  } else {
    // boton de login por defecto
    container.innerHTML = `<a href="login.html?redirect=${encodeURIComponent(window.location.pathname.split('/').pop() || 'index.html')}" class="btn btn-secondary btn-sm" style="padding:6px 12px">Iniciar Sesión</a>`;
  }
}

// ir al historial o redireccionar
function handleHistoryNavigation(tab) {
  const overlay = document.getElementById('clientHistoryOverlay');
  if (overlay) {
    // si esta en index abre el modal
    openClientHistoryModal(tab);
  } else {
    // si esta en otra pagina lo manda al index con parametro
    window.location.href = `index.html?openHistory=${tab}`;
  }
}

// cerrar sesion de la tienda
function handleStoreLogout(e) {
  if (e) e.preventDefault();
  sessionStorage.removeItem('user');
  currentUser = null;
  showToast('Sesión cerrada correctamente', 'success');
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

// utilidades de redireccion
function redirectToLogin() {
  window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname.split('/').pop() || 'index.html')}`;
}

function closeAuthRequiredModal() {
  const modal = document.getElementById('authRequiredOverlay');
  if (modal) modal.classList.remove('active');
}

// carga de productos y categorias
async function loadStoreCategories() {
  const sel = document.getElementById('storeCategory');
  if (!sel) return;
  const res = await window.api.getCategories();
  if (res.success) {
    sel.innerHTML = '<option value="">Todas las categorías</option>';
    res.data.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent = c.nombre;
      sel.appendChild(o);
    });
  }
}

async function loadStoreProducts() {
  const grid = document.getElementById('storeProductsGrid');
  if (!grid) return;
  
  const searchInput = document.getElementById('storeSearch');
  const catSelect = document.getElementById('storeCategory');
  const search = searchInput ? searchInput.value : '';
  const categoryId = catSelect ? catSelect.value : '';
  const params = {};
  if (search) params.search = search;
  if (categoryId) params.categoria_id = parseInt(categoryId);

  const response = await fetch('/api/public/products?' + new URLSearchParams(params).toString());
  const res = await response.json();
  
  if (!res.success || res.data.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:80px"><h3>No hay productos disponibles</h3><p>Intente con otra búsqueda o categoría</p></div>';
    return;
  }

  grid.innerHTML = res.data.map(p => `
    <div class="store-product-card">
      <div>
        <span class="cat">${p.categoria_nombre || 'Sin categoría'}</span>
        <h4 class="name">${p.nombre}</h4>
        <div style="font-size:12px;color:var(--text-muted);margin:4px 0;">Garantía: ${p.garantia_meses || 0} meses</div>
      </div>
      <div>
        <div class="price">${formatCurrency(p.precio_venta)}</div>
        <div class="meta">
          <span>Stock: ${p.stock_actual}</span>
          <button class="btn btn-primary btn-sm" onclick="addStoreProductToCart(${p.id}, '${p.nombre.replace(/'/g,"\\'")}', ${p.precio_venta}, ${p.stock_actual})">Agregar</button>
        </div>
      </div>
    </div>`).join('');
}

// logica del carrito
function addStoreProductToCart(id, nombre, precio, stockMax) {
  const existing = storeCart.find(i => i.producto_id === id);
  if (existing) {
    if (existing.cantidad >= stockMax) {
      showToast('Stock máximo disponible alcanzado', 'warning');
      return;
    }
    existing.cantidad++;
  } else {
    storeCart.push({ producto_id: id, nombre, precio_unitario: precio, cantidad: 1, stock_max: stockMax });
  }
  localStorage.setItem('storeCart', JSON.stringify(storeCart));
  renderStoreCart();
  showToast(`${nombre} agregado al carrito`, 'success');
  const drawer = document.getElementById('cartDrawer');
  if (drawer) drawer.classList.add('open');
}

function renderStoreCart() {
  const container = document.getElementById('cartDrawerBody');
  const countBadge = document.getElementById('cartCount');
  if (!container) return;
  
  if (storeCart.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:60px 0"><p>Tu carrito está vacío</p></div>';
    if (countBadge) countBadge.textContent = 0;
    updateStoreCartTotals();
    return;
  }
  
  if (countBadge) countBadge.textContent = storeCart.reduce((sum, i) => sum + i.cantidad, 0);
  container.innerHTML = storeCart.map((item, i) => `
    <div class="cart-item" style="padding:12px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-md);">
      <div class="item-info"><div class="name">${item.nombre}</div><div class="price">${formatCurrency(item.precio_unitario)} c/u</div></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;">
        <div class="item-qty">
          <button onclick="updateStoreCartQty(${i}, -1)">−</button><span>${item.cantidad}</span><button onclick="updateStoreCartQty(${i}, 1)">+</button>
        </div>
        <div class="item-total font-mono" style="font-weight:700">${formatCurrency(item.precio_unitario * item.cantidad)}</div>
        <button class="remove-item" onclick="removeStoreCartItem(${i})" style="margin:0">✕</button>
      </div>
    </div>`).join('');
  updateStoreCartTotals();
}

function updateStoreCartQty(index, delta) {
  const item = storeCart[index];
  item.cantidad += delta;
  if (item.cantidad <= 0) {
    storeCart.splice(index, 1);
  } else if (item.cantidad > item.stock_max) {
    item.cantidad = item.stock_max;
    showToast('Stock máximo disponible alcanzado', 'warning');
  }
  localStorage.setItem('storeCart', JSON.stringify(storeCart));
  renderStoreCart();
}

function removeStoreCartItem(index) {
  storeCart.splice(index, 1);
  localStorage.setItem('storeCart', JSON.stringify(storeCart));
  renderStoreCart();
}

function updateStoreCartTotals() {
  const subtotalEl = document.getElementById('storeCartSubtotal');
  const totalEl = document.getElementById('storeCartTotal');
  if (!subtotalEl || !totalEl) return;

  const subtotal = storeCart.reduce((sum, i) => sum + (i.precio_unitario * i.cantidad), 0);
  const total = subtotal * 1.16; // calculo con el iva
  subtotalEl.textContent = formatCurrency(subtotal);
  totalEl.textContent = formatCurrency(total);
}

// procesar el pago o abrir modal
function handleCheckoutStep() {
  if (storeCart.length === 0) {
    showToast('El carrito está vacío', 'warning');
    return;
  }
  
  if (!currentUser) {
    const modal = document.getElementById('authRequiredOverlay');
    if (modal) modal.classList.add('active');
  } else {
    openCheckoutModal();
  }
}

function openCheckoutModal() {
  const overlay = document.getElementById('checkoutOverlay');
  if (!overlay) return;
  overlay.classList.add('active');
  
  if (currentUser) {
    const nameEl = document.getElementById('chkNombre');
    const emailEl = document.getElementById('chkEmail');
    const phoneEl = document.getElementById('chkTelefono');
    const addressEl = document.getElementById('chkDireccion');

    if (nameEl) nameEl.value = currentUser.nombre || '';
    if (emailEl) emailEl.value = localStorage.getItem('last_email_' + currentUser.usuario) || '';
    if (phoneEl) phoneEl.value = localStorage.getItem('last_phone_' + currentUser.usuario) || '';
    if (addressEl) addressEl.value = localStorage.getItem('last_address_' + currentUser.usuario) || '';
  }
}

function closeCheckoutModal() {
  const overlay = document.getElementById('checkoutOverlay');
  if (overlay) overlay.classList.remove('active');
}

async function processWebCheckout() {
  const nombre = document.getElementById('chkNombre').value.trim();
  const telefono = document.getElementById('chkTelefono').value.trim();
  const email = document.getElementById('chkEmail').value.trim();
  const direccion = document.getElementById('chkDireccion').value.trim();
  const metodo_pago = document.getElementById('chkPago').value;
  
  if (!nombre || !telefono || !email || !direccion) {
    showToast('Complete todos los campos obligatorios', 'warning');
    return;
  }
  
  const submitBtn = document.getElementById('chkSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Procesando...';
  
  const checkoutData = {
    cliente: { nombre, telefono, email, direccion },
    items: storeCart.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario })),
    metodo_pago
  };
  
  try {
    const response = await fetch('/api/sales/online', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkoutData)
    });
    const res = await response.json();
    
    if (res.success) {
      alert(`¡Compra realizada con éxito!\nSu folio de compra es: ${res.folio}`);
      
      // guardar datos para la proxima compra
      if (currentUser) {
        localStorage.setItem('last_email_' + currentUser.usuario, email);
        localStorage.setItem('last_phone_' + currentUser.usuario, telefono);
        localStorage.setItem('last_address_' + currentUser.usuario, direccion);
      }
      
      storeCart = [];
      localStorage.removeItem('storeCart');
      renderStoreCart();
      closeCheckoutModal();
      const drawer = document.getElementById('cartDrawer');
      if (drawer) drawer.classList.remove('open');
      await loadStoreProducts();
    } else {
      showToast('Error: ' + res.message, 'error');
    }
  } catch (err) {
    showToast('Error de conexión al procesar el pago', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Finalizar Compra';
  }
}

// historial del cliente
let activeHistoryTab = 'compras';

function openClientHistoryModal(tab = 'compras') {
  if (!currentUser) return;
  const overlay = document.getElementById('clientHistoryOverlay');
  if (!overlay) return;
  overlay.classList.add('active');
  switchHistoryTab(tab);
}

function closeClientHistoryModal() {
  const overlay = document.getElementById('clientHistoryOverlay');
  if (overlay) overlay.classList.remove('active');
}

function switchHistoryTab(tab) {
  activeHistoryTab = tab;
  
  const tabCompras = document.getElementById('tabHistCompras');
  const tabReparaciones = document.getElementById('tabHistReparaciones');
  const paneCompras = document.getElementById('historyComprasPane');
  const paneReparaciones = document.getElementById('historyReparacionesPane');
  
  if (!tabCompras || !tabReparaciones || !paneCompras || !paneReparaciones) return;

  if (tab === 'compras') {
    tabCompras.classList.add('active');
    tabReparaciones.classList.remove('active');
    paneCompras.style.display = 'block';
    paneReparaciones.style.display = 'none';
    loadClientPurchases();
  } else {
    tabReparaciones.classList.add('active');
    tabCompras.classList.remove('active');
    paneReparaciones.style.display = 'block';
    paneCompras.style.display = 'none';
    loadClientRepairs();
  }
}

async function loadClientPurchases() {
  const tbody = document.getElementById('historyComprasTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">Cargando compras...</td></tr>';
  
  try {
    const response = await fetch(`/api/sales?cliente_usuario=${encodeURIComponent(currentUser.usuario)}`);
    const res = await response.json();
    
    if (res.success) {
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted);">No tiene compras registradas.</td></tr>';
        return;
      }
      
      tbody.innerHTML = res.data.map(v => `
        <tr>
          <td class="font-mono">${v.folio}</td>
          <td>${formatDate(v.fecha)}</td>
          <td class="font-mono" style="font-weight:600;">${formatCurrency(v.total)}</td>
          <td>${v.metodo_pago}</td>
          <td><span class="badge badge-success">${v.estado || 'Completada'}</span></td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="viewPurchaseDetails(${v.id}, '${v.folio}', ${v.total})" style="padding:4px 8px;font-size:11px;">
              Detalles
            </button>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--danger);">${res.message}</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--danger);">Error al cargar compras.</td></tr>';
  }
}

async function loadClientRepairs() {
  const tbody = document.getElementById('historyReparacionesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">Cargando reparaciones...</td></tr>';
  
  try {
    const response = await fetch(`/api/workshop?cliente_usuario=${encodeURIComponent(currentUser.usuario)}`);
    const res = await response.json();
    
    if (res.success) {
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted);">No tiene reparaciones registradas en taller.</td></tr>';
        return;
      }
      
      tbody.innerHTML = res.data.map(os => {
        let statusBadgeClass = 'badge-info';
        if (os.estado === 'Cancelado') statusBadgeClass = 'badge-danger';
        else if (os.estado === 'Terminado' || os.estado === 'Entregado') statusBadgeClass = 'badge-success';
        
        return `
          <tr>
            <td class="font-mono">${os.folio}</td>
            <td>${formatDate(os.fecha_recepcion)}</td>
            <td>${os.equipo_descripcion}</td>
            <td class="font-mono">${os.costo_servicio > 0 ? formatCurrency(os.costo_servicio) : '-'}</td>
            <td><span class="badge ${statusBadgeClass}">${os.estado}</span></td>
            <td>
              <a href="support-track.html?folio=${os.folio}" class="btn btn-primary btn-sm" style="padding:4px 8px;font-size:11px;text-decoration:none;display:inline-block;">
                Rastrear
              </a>
            </td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--danger);">${res.message}</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--danger);">Error al cargar reparaciones.</td></tr>';
  }
}

async function viewPurchaseDetails(saleId, folio, total) {
  const tbody = document.getElementById('purchaseDetailTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:15px;">Cargando detalles...</td></tr>';
  
  const titleEl = document.getElementById('purchaseDetailTitle');
  const totalEl = document.getElementById('purchaseDetailTotal');
  const overlay = document.getElementById('purchaseDetailOverlay');
  
  if (titleEl) titleEl.textContent = `Detalle de Compra: ${folio}`;
  if (totalEl) totalEl.textContent = formatCurrency(total);
  if (overlay) overlay.classList.add('active');
  
  try {
    const response = await fetch(`/api/sales/${saleId}/detail`);
    const res = await response.json();
    if (res.success) {
      tbody.innerHTML = res.data.map(item => `
        <tr>
          <td class="font-bold">${item.producto_nombre} <div style="font-size:10px;color:var(--text-muted);font-weight:400;margin-top:2px;">Código: ${item.producto_codigo}</div></td>
          <td class="font-mono">${item.cantidad}</td>
          <td class="font-mono">${formatCurrency(item.precio_unitario)}</td>
          <td class="font-mono" style="font-weight:600;">${formatCurrency(item.subtotal)}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:15px;color:var(--danger);">${res.message}</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:15px;color:var(--danger);">Error al cargar detalles.</td></tr>';
  }
}

function closePurchaseDetailModal() {
  const overlay = document.getElementById('purchaseDetailOverlay');
  if (overlay) overlay.classList.remove('active');
}

// abrir historial del cliente si viene en la url
const urlParams = new URLSearchParams(window.location.search);
const openHistoryTab = urlParams.get('openHistory');
if (openHistoryTab) {
  openClientHistoryModal(openHistoryTab);
  // limpiar parametros de la url sin recargar
  const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
  window.history.replaceState({path: cleanUrl}, '', cleanUrl);
}
