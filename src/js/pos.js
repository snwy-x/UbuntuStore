// modulo punto de venta


let posCart = [];

async function renderPOS(container) {
  container.innerHTML = `
    <div class="pos-layout">
      <div class="pos-products">
        <div class="table-container" style="flex:1;display:flex;flex-direction:column;overflow:hidden">
          <div class="table-toolbar">
            <div class="search-box"><span class="search-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></span><input type="text" id="posSearch" placeholder="Buscar producto por nombre o código..." oninput="searchPOSProducts()"></div>
            <select id="posCatFilter" class="filter-btn" onchange="searchPOSProducts()"><option value="">Todas</option></select>
          </div>
          <div style="flex:1;overflow-y:auto;padding:12px">
            <div class="product-grid" id="posProductGrid"></div>
          </div>
        </div>
      </div>
      <div class="pos-cart">
        <div class="pos-cart-header"><h3>Carrito <span id="cartCount" class="badge badge-purple" style="display:none">0</span></h3>
          <button class="btn btn-sm btn-secondary" onclick="clearCart()">Vaciar</button>
        </div>
        <div class="pos-cart-items" id="cartItems"><div class="empty-state" style="padding:40px"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:48px;height:48px;opacity:0.3;"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg></div><p>Agregue productos al carrito</p></div></div>
        <div class="pos-cart-footer">
          <div class="form-group mb-1"><label>Cliente (opcional)</label><select id="posClient"><option value="">Público general</option></select></div>
          <div class="form-group mb-1"><label>Método de pago</label><select id="posPayment"><option value="Efectivo">Efectivo</option><option value="Tarjeta">Tarjeta</option><option value="Transferencia">Transferencia</option></select></div>
          <div class="cart-totals">
            <div class="total-line"><span>Subtotal</span><span id="cartSubtotal" class="font-mono">$0.00</span></div>
            <div class="total-line"><span>IVA (16%)</span><span id="cartTax" class="font-mono">$0.00</span></div>
            <div class="total-line grand-total"><span>Total</span><span id="cartTotal" class="font-mono">$0.00</span></div>
          </div>
          <button class="btn btn-primary btn-block btn-lg" onclick="processSale()" id="processSaleBtn">Procesar Venta</button>
        </div>
      </div>
    </div>`;
  
  // categorias
  const cats = await window.api.getCategories();
  if (cats.success) { const sel = document.getElementById('posCatFilter'); cats.data.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.nombre; sel.appendChild(o); }); }
  
  // clientes
  const clients = await window.api.getClients();
  if (clients.success) { const sel = document.getElementById('posClient'); clients.data.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.nombre; sel.appendChild(o); }); }
  
  posCart = [];
  await searchPOSProducts();
}

async function searchPOSProducts() {
  const search = document.getElementById('posSearch')?.value || '';
  const catId = document.getElementById('posCatFilter')?.value || '';
  const filters = { search };
  if (catId) filters.categoria_id = parseInt(catId);
  
  const res = await window.api.getProducts(filters);
  const grid = document.getElementById('posProductGrid');
  if (!res.success || res.data.length === 0) { grid.innerHTML = '<div class="empty-state"><p>No se encontraron productos</p></div>'; return; }
  
  grid.innerHTML = res.data.filter(p => p.stock_actual > 0).map(p => `
    <div class="product-card" onclick='addToCart(${JSON.stringify({id:p.id,codigo:p.codigo,nombre:p.nombre,precio_venta:p.precio_venta,stock_actual:p.stock_actual}).replace(/'/g,"&#39;")})'>
      <div class="p-category">${p.categoria_nombre || 'Sin categoría'}</div>
      <div class="p-name">${p.nombre}</div>
      <div class="p-code">${p.codigo}</div>
      <div class="p-bottom">
        <div class="p-price">${formatCurrency(p.precio_venta)}</div>
        <div class="p-stock ${p.stock_actual <= p.stock_minimo ? 'low' : ''}">Stock: ${p.stock_actual}</div>
      </div>
    </div>`).join('');
}

function addToCart(product) {
  const existing = posCart.find(i => i.producto_id === product.id);
  if (existing) {
    if (existing.cantidad >= product.stock_actual) { showToast('Stock insuficiente', 'warning'); return; }
    existing.cantidad++;
    existing.subtotal = existing.cantidad * existing.precio_unitario;
  } else {
    posCart.push({ producto_id: product.id, codigo: product.codigo, nombre: product.nombre, precio_unitario: product.precio_venta, cantidad: 1, subtotal: product.precio_venta, stock_max: product.stock_actual });
  }
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cartItems');
  const countBadge = document.getElementById('cartCount');
  
  if (posCart.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:40px"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:48px;height:48px;opacity:0.3;"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg></div><p>Agregue productos al carrito</p></div>';
    countBadge.style.display = 'none';
  } else {
    countBadge.textContent = posCart.length; countBadge.style.display = 'inline';
    container.innerHTML = posCart.map((item, i) => `
      <div class="cart-item">
        <div class="item-info"><div class="name">${item.nombre}</div><div class="price">${formatCurrency(item.precio_unitario)} c/u</div></div>
        <div class="item-qty">
          <button onclick="updateCartQty(${i}, -1)">−</button><span>${item.cantidad}</span><button onclick="updateCartQty(${i}, 1)">+</button>
        </div>
        <div class="item-total">${formatCurrency(item.subtotal)}</div>
        <button class="remove-item" onclick="removeCartItem(${i})">✕</button>
      </div>`).join('');
  }
  updateCartTotals();
}

function updateCartQty(index, delta) {
  const item = posCart[index];
  item.cantidad += delta;
  if (item.cantidad <= 0) { posCart.splice(index, 1); }
  else if (item.cantidad > item.stock_max) { item.cantidad = item.stock_max; showToast('Stock máximo alcanzado', 'warning'); }
  else { item.subtotal = item.cantidad * item.precio_unitario; }
  renderCart();
}

function removeCartItem(index) { posCart.splice(index, 1); renderCart(); }
function clearCart() { posCart = []; renderCart(); }

function updateCartTotals() {
  const subtotal = posCart.reduce((sum, i) => sum + i.subtotal, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;
  document.getElementById('cartSubtotal').textContent = formatCurrency(subtotal);
  document.getElementById('cartTax').textContent = formatCurrency(tax);
  document.getElementById('cartTotal').textContent = formatCurrency(total);
}

async function processSale() {
  if (posCart.length === 0) { showToast('El carrito está vacío', 'warning'); return; }
  const subtotal = posCart.reduce((sum, i) => sum + i.subtotal, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;
  const clienteId = document.getElementById('posClient').value;
  
  const saleData = {
    cliente_id: clienteId ? parseInt(clienteId) : null,
    usuario_id: currentUser.id,
    subtotal, impuesto: tax, total,
    metodo_pago: document.getElementById('posPayment').value,
    items: posCart.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario, subtotal: i.subtotal }))
  };
  
  const btn = document.getElementById('processSaleBtn');
  btn.disabled = true; btn.textContent = 'Procesando...';
  
  const res = await window.api.createSale(saleData);
  btn.disabled = false; btn.textContent = 'Procesar Venta';
  
  if (res.success) {
    showToast(`Venta ${res.folio} registrada exitosamente`, 'success');
    showTicket(res.folio, saleData, posCart);
    posCart = []; renderCart(); await searchPOSProducts();
    await window.api.logAudit({ usuario_id: currentUser.id, accion: 'VENTA', tabla_afectada: 'Ventas', registro_id: res.ventaId, detalle: `Venta ${res.folio} - Total: ${formatCurrency(total)}` });
  } else { showToast('Error: ' + res.message, 'error'); }
}

function showTicket(folio, sale, items) {
  const now = new Date().toLocaleString('es-MX');
  const body = `<div style="text-align:center;font-family:monospace;font-size:13px">
    <h2 style="margin-bottom:4px">UbuntuStore</h2><p style="color:var(--text-muted)">Ticket de Venta</p><hr style="border-color:var(--border-color)">
    <p><strong>Folio:</strong> ${folio}</p><p><strong>Fecha:</strong> ${now}</p><p><strong>Vendedor:</strong> ${currentUser.nombre}</p>
    <p><strong>Pago:</strong> ${sale.metodo_pago}</p><hr style="border-color:var(--border-color)">
    <table style="width:100%;text-align:left;font-size:12px"><thead><tr><th>Producto</th><th>Cant</th><th>P.U.</th><th>Subt</th></tr></thead>
    <tbody>${items.map(i => `<tr><td>${i.nombre}</td><td>${i.cantidad}</td><td>${formatCurrency(i.precio_unitario)}</td><td>${formatCurrency(i.subtotal)}</td></tr>`).join('')}</tbody></table>
    <hr style="border-color:var(--border-color)">
    <p>Subtotal: <span class="font-mono">${formatCurrency(sale.subtotal)}</span></p><p>IVA 16%: <span class="font-mono">${formatCurrency(sale.impuesto)}</span></p>
    <p style="font-size:18px;font-weight:bold">TOTAL: <span class="font-mono">${formatCurrency(sale.total)}</span></p>
    <hr style="border-color:var(--border-color)"><p style="color:var(--text-muted)">¡Gracias por su compra!</p></div>`;
  openModal('Ticket de Venta', body, '<button class="btn btn-primary" onclick="window.print()">Imprimir</button><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
}

// historial de ventas
async function renderSalesHistory(container) {
  container.innerHTML = `<div class="table-container">
    <div class="table-toolbar"><div class="filters"><label style="font-size:13px;color:var(--text-secondary)">Fecha:</label><input type="date" id="salesDateFilter" class="filter-btn" onchange="loadSalesHistory()"></div></div>
    <div class="table-wrapper"><table class="data-table"><thead><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th>Vendedor</th><th>Total</th><th>Pago</th><th>Acciones</th></tr></thead>
    <tbody id="salesTableBody"></tbody></table></div></div>`;
  await loadSalesHistory();
}

async function loadSalesHistory() {
  const fecha = document.getElementById('salesDateFilter')?.value || '';
  const params = fecha ? { fecha } : {};
  if (currentUser.rol === 'Cliente') {
    params.cliente_usuario = currentUser.usuario;
  }
  const res = await window.api.getSales(params);
  const tbody = document.getElementById('salesTableBody');
  if (!res.success || res.data.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:40px">No hay ventas registradas</td></tr>'; return; }
  tbody.innerHTML = res.data.map(v => `<tr>
    <td><code>${v.folio}</code></td><td>${formatDateTime(v.fecha)}</td><td>${v.cliente_nombre || 'Público general'}</td>
    <td>${v.vendedor}</td><td class="text-accent font-bold">${formatCurrency(v.total)}</td>
    <td><span class="badge badge-info">${v.metodo_pago}</span></td>
    <td><button class="action-btn" onclick="viewSaleDetail(${v.id}, '${v.folio}')" title="Ver detalle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg></button></td>
  </tr>`).join('');
}

async function viewSaleDetail(ventaId, folio) {
  const res = await window.api.getSaleDetail(ventaId);
  if (!res.success) { showToast('Error al cargar detalle', 'error'); return; }
  const body = `<table class="data-table"><thead><tr><th>Código</th><th>Producto</th><th>Cant</th><th>P.U.</th><th>Subtotal</th></tr></thead>
    <tbody>${res.data.map(d => `<tr><td><code>${d.producto_codigo}</code></td><td>${d.producto_nombre}</td><td>${d.cantidad}</td><td>${formatCurrency(d.precio_unitario)}</td><td>${formatCurrency(d.subtotal)}</td></tr>`).join('')}</tbody></table>`;
  openModal(`Detalle Venta ${folio}`, body, '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
}
