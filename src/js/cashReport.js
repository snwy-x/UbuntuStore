// modulo de reporte de caja


async function renderCashReport(container) {
  const today = new Date().toISOString().split('T')[0];
  container.innerHTML = `
    <div class="stats-grid" id="cashStats"></div>
    <div class="table-container">
      <div class="table-toolbar">
        <div class="filters">
          <label style="font-size:13px;color:var(--text-secondary)">Desde:</label><input type="date" id="cashFrom" class="filter-btn" value="${today}">
          <label style="font-size:13px;color:var(--text-secondary)">Hasta:</label><input type="date" id="cashTo" class="filter-btn" value="${today}">
          <button class="btn btn-sm btn-primary" onclick="loadCashReport()">Consultar</button>
          <button class="btn btn-sm btn-secondary" onclick="window.print()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;margin-right:6px;vertical-align:middle;display:inline-block;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>Imprimir</button>
        </div>
      </div>
      <div class="table-wrapper"><table class="data-table"><thead><tr><th>Fecha/Hora</th><th>Tipo</th><th>Concepto</th><th>Monto</th><th>Usuario</th></tr></thead>
      <tbody id="cashTableBody"></tbody></table></div>
    </div>`;
  await loadCashReport();
}

async function loadCashReport() {
  const fechaInicio = document.getElementById('cashFrom').value;
  const fechaFin = document.getElementById('cashTo').value;
  const res = await window.api.getCashMovements({ fechaInicio, fechaFin });
  const tbody = document.getElementById('cashTableBody');
  const stats = document.getElementById('cashStats');
  
  if (!res.success) { tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${res.message}</td></tr>`; return; }
  
  const s = res.summary;
  stats.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon green" style="background:rgba(46,204,113,0.1);padding:10px;border-radius:6px;display:flex;align-items:center;justify-content:center;">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
      </div>
      <div class="stat-info">
        <h3 class="text-success font-mono">${formatCurrency(s.total_ingresos)}</h3>
        <p>Total Ingresos</p>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon orange" style="background:rgba(231,76,60,0.1);padding:10px;border-radius:6px;display:flex;align-items:center;justify-content:center;">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px;"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
      </div>
      <div class="stat-info">
        <h3 class="text-danger font-mono">${formatCurrency(s.total_egresos)}</h3>
        <p>Total Egresos</p>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon teal" style="background:rgba(52,152,219,0.1);padding:10px;border-radius:6px;display:flex;align-items:center;justify-content:center;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px;color:var(--text-accent);"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
      </div>
      <div class="stat-info">
        <h3 style="color:${s.utilidad >= 0 ? 'var(--accent)' : 'var(--danger)'}" class="font-mono">${formatCurrency(s.utilidad)}</h3>
        <p>Utilidad Neta</p>
      </div>
    </div>`;
  
  if (res.data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding:40px">Sin movimientos en este período</td></tr>'; return; }
  tbody.innerHTML = res.data.map(m => `<tr>
    <td class="font-mono">${formatDateTime(m.fecha)}</td>
    <td><span class="badge badge-${m.tipo === 'Ingreso' ? 'success' : 'danger'}">${m.tipo}</span></td>
    <td>${m.concepto}</td>
    <td class="${m.tipo === 'Ingreso' ? 'text-success' : 'text-danger'} font-bold font-mono">${m.tipo === 'Ingreso' ? '+' : '-'}${formatCurrency(m.monto)}</td>
    <td>${m.usuario_nombre}</td></tr>`).join('');
}

// modulo de cotizador (ensambles pc)

let quoterItems = [];

async function renderQuoter(container) {
  quoterItems = [];
  const prods = await window.api.getProducts({});
  const cats = await window.api.getCategories();
  const clients = await window.api.getClients();
  const catOpts = cats.success ? cats.data.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('') : '';
  const prodList = prods.success ? prods.data : [];
  const clientOpts = clients.success ? clients.data.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('') : '';
  
  container.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 360px;gap:20px">
      <div>
        <div class="table-container" style="margin-bottom:20px">
          <div class="table-toolbar"><h3 style="font-size:15px">Seleccionar Componentes</h3></div>
          <div style="padding:16px">
            <div class="form-row-3 mb-2">
              <div class="form-group"><label>Categoría</label><select id="qtCatFilter" onchange="filterQuoterProducts()"><option value="">Todas</option>${catOpts}</select></div>
              <div class="form-group"><label>Buscar</label><input type="text" id="qtSearch" placeholder="Buscar..." oninput="filterQuoterProducts()"></div>
              <div class="form-group"></div>
            </div>
            <div class="table-wrapper" style="max-height:400px;overflow-y:auto"><table class="data-table"><thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Precio</th><th></th></tr></thead>
            <tbody id="qtProductsBody"></tbody></table></div>
          </div>
        </div>
        <div class="table-container">
          <div class="table-toolbar"><h3 style="font-size:15px">Cotizaciones Guardadas</h3></div>
          <div class="table-wrapper"><table class="data-table"><thead><tr><th>ID</th><th>Fecha</th><th>Nombre</th><th>Cliente</th><th>Total</th></tr></thead>
          <tbody id="qtHistoryBody"></tbody></table></div>
        </div>
      </div>
      <div class="pos-cart">
        <div class="pos-cart-header"><h3>Ensamble</h3></div>
        <div style="padding:12px"><div class="form-group"><label>Nombre del ensamble</label><input type="text" id="qtNombre" placeholder="Ej: PC Gamer RTX 4060" value="Ensamble PC"></div>
        <div class="form-group"><label>Cliente (opcional)</label><select id="qtCliente"><option value="">Sin cliente</option>${clientOpts}</select></div></div>
        <div class="pos-cart-items" id="qtItems"><div class="empty-state" style="padding:30px"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:48px;height:48px;opacity:0.3;"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg></div><p>Agregue componentes</p></div></div>
        <div class="pos-cart-footer">
          <div class="cart-totals"><div class="total-line grand-total"><span>Total</span><span id="qtTotal" class="font-mono">$0.00</span></div></div>
          <button class="btn btn-primary btn-block" onclick="saveQuotation()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;margin-right:6px;vertical-align:middle;display:inline-block;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>Guardar Cotización</button>
          <button class="btn btn-secondary btn-block mt-1" onclick="printQuotation()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;margin-right:6px;vertical-align:middle;display:inline-block;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>Imprimir</button>
        </div>
      </div>
    </div>`;
  
  window._qtProducts = prodList;
  filterQuoterProducts();
  loadQuotationHistory();
}

function filterQuoterProducts() {
  const catId = document.getElementById('qtCatFilter')?.value || '';
  const search = (document.getElementById('qtSearch')?.value || '').toLowerCase();
  let filtered = window._qtProducts || [];
  if (catId) filtered = filtered.filter(p => p.categoria_id === parseInt(catId));
  if (search) filtered = filtered.filter(p => p.nombre.toLowerCase().includes(search) || p.codigo.toLowerCase().includes(search));
  
  document.getElementById('qtProductsBody').innerHTML = filtered.map(p => `<tr>
    <td><code>${p.codigo}</code></td><td>${p.nombre}</td><td><span class="badge badge-purple">${p.categoria_nombre || '-'}</span></td>
    <td class="text-accent font-bold font-mono">${formatCurrency(p.precio_venta)}</td>
    <td><button class="btn btn-sm btn-primary" onclick="addQuoterItem(${p.id}, '${p.nombre.replace(/'/g,"\\'")}', ${p.precio_venta})">+</button></td></tr>`).join('');
}

function addQuoterItem(id, nombre, precio) {
  const existing = quoterItems.find(i => i.producto_id === id);
  if (existing) { existing.cantidad++; existing.subtotal = existing.cantidad * existing.precio_unitario; }
  else { quoterItems.push({ producto_id: id, nombre, precio_unitario: precio, cantidad: 1, subtotal: precio }); }
  renderQuoterItems();
}

function renderQuoterItems() {
  const container = document.getElementById('qtItems');
  if (quoterItems.length === 0) { container.innerHTML = '<div class="empty-state" style="padding:30px"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:48px;height:48px;opacity:0.3;"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg></div><p>Agregue componentes</p></div>'; }
  else { container.innerHTML = quoterItems.map((item, i) => `<div class="cart-item"><div class="item-info"><div class="name">${item.nombre}</div><div class="price"><span class="font-mono">${formatCurrency(item.precio_unitario)}</span> x ${item.cantidad}</div></div>
    <div class="item-total font-mono">${formatCurrency(item.subtotal)}</div><button class="remove-item" onclick="quoterItems.splice(${i},1);renderQuoterItems()">✕</button></div>`).join(''); }
  document.getElementById('qtTotal').textContent = formatCurrency(quoterItems.reduce((s, i) => s + i.subtotal, 0));
}

async function saveQuotation() {
  if (quoterItems.length === 0) { showToast('Agregue componentes', 'warning'); return; }
  const total = quoterItems.reduce((s, i) => s + i.subtotal, 0);
  const clienteId = document.getElementById('qtCliente').value;
  const res = await window.api.saveQuotation({ cliente_id: clienteId ? parseInt(clienteId) : null, usuario_id: currentUser.id,
    nombre_ensamble: document.getElementById('qtNombre').value.trim() || 'Ensamble PC', total, items: quoterItems });
  if (res.success) { showToast('Cotización guardada', 'success'); quoterItems = []; renderQuoterItems(); loadQuotationHistory(); }
  else { showToast('Error: ' + res.message, 'error'); }
}

function printQuotation() {
  if (quoterItems.length === 0) { showToast('No hay componentes', 'warning'); return; }
  const total = quoterItems.reduce((s, i) => s + i.subtotal, 0);
  const body = `<div style="text-align:center;font-family:monospace"><h2>UbuntuStore - Cotización</h2><p>Fecha: ${new Date().toLocaleDateString('es-MX')}</p>
    <p><strong>${document.getElementById('qtNombre').value}</strong></p><hr style="border-color:var(--border-color)">
    <table class="data-table"><thead><tr><th>Componente</th><th>Cant</th><th>Precio</th><th>Subtotal</th></tr></thead>
    <tbody>${quoterItems.map(i => `<tr><td>${i.nombre}</td><td>${i.cantidad}</td><td class="font-mono">${formatCurrency(i.precio_unitario)}</td><td class="font-mono">${formatCurrency(i.subtotal)}</td></tr>`).join('')}</tbody></table>
    <hr style="border-color:var(--border-color)"><p style="font-size:18px;font-weight:bold">TOTAL: <span class="font-mono">${formatCurrency(total)}</span></p></div>`;
  openModal('Cotización', body, '<button class="btn btn-primary" onclick="window.print()">Imprimir</button><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
}

async function loadQuotationHistory() {
  const res = await window.api.getQuotations();
  const tbody = document.getElementById('qtHistoryBody');
  if (!res.success || res.data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding:20px">Sin cotizaciones</td></tr>'; return; }
  tbody.innerHTML = res.data.map(q => `<tr><td class="font-mono">${q.id}</td><td class="font-mono">${formatDate(q.fecha)}</td><td>${q.nombre_ensamble}</td><td>${q.cliente_nombre || '-'}</td><td class="text-accent font-bold font-mono">${formatCurrency(q.total)}</td></tr>`).join('');
}
