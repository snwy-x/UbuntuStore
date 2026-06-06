// modulo de proveedores y compras

async function renderSuppliers(container, actions) {
  actions.innerHTML = '<button class="btn btn-primary btn-sm" onclick="openSupplierModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;margin-right:6px;vertical-align:middle;display:inline-block;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Nuevo Proveedor</button>';
  container.innerHTML = `<div class="table-container">
    <div class="table-wrapper"><table class="data-table"><thead><tr><th>Nombre</th><th>Contacto</th><th>Teléfono</th><th>Email</th><th>Dirección</th><th>Acciones</th></tr></thead>
    <tbody id="suppTableBody"></tbody></table></div></div>`;
  await loadSuppliers();
}

async function loadSuppliers() {
  const res = await window.api.getSuppliers();
  const tbody = document.getElementById('suppTableBody');
  if (!res.success || res.data.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:40px">No hay proveedores</td></tr>'; return; }
  tbody.innerHTML = res.data.map(s => `<tr>
    <td class="font-bold">${s.nombre}</td><td>${s.contacto || '-'}</td><td class="font-mono">${s.telefono || '-'}</td><td>${s.email || '-'}</td><td class="truncate" style="max-width:150px">${s.direccion || '-'}</td>
    <td><div class="action-btns">
      <button class="action-btn" onclick='openSupplierModal(${JSON.stringify(s).replace(/'/g,"&#39;")})' title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
      <button class="action-btn delete" onclick="deleteSupplier(${s.id})" title="Eliminar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
    </div></td></tr>`).join('');
}

function openSupplierModal(supp = null) {
  const body = `<form>
    <div class="form-group"><label>Nombre *</label><input type="text" id="sNombre" value="${supp?.nombre || ''}" required></div>
    <div class="form-row"><div class="form-group"><label>Contacto</label><input type="text" id="sContacto" value="${supp?.contacto || ''}"></div>
    <div class="form-group"><label>Teléfono</label><input type="text" id="sTelefono" value="${supp?.telefono || ''}"></div></div>
    <div class="form-group"><label>Email</label><input type="email" id="sEmail" value="${supp?.email || ''}"></div>
    <div class="form-group"><label>Dirección</label><input type="text" id="sDireccion" value="${supp?.direccion || ''}"></div></form>`;
  openModal(supp ? 'Editar Proveedor' : 'Nuevo Proveedor', body,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveSupplier(${supp?.id || 'null'})">${supp ? 'Actualizar' : 'Guardar'}</button>`);
}

async function saveSupplier(id) {
  const data = { nombre: document.getElementById('sNombre').value.trim(), contacto: document.getElementById('sContacto').value.trim(),
    telefono: document.getElementById('sTelefono').value.trim(), email: document.getElementById('sEmail').value.trim(), direccion: document.getElementById('sDireccion').value.trim() };
  if (!data.nombre) { showToast('El nombre es obligatorio', 'warning'); return; }
  let res; if (id) { data.id = id; res = await window.api.updateSupplier(data); } else { res = await window.api.createSupplier(data); }
  if (res.success) { closeModal(); showToast(id ? 'Proveedor actualizado' : 'Proveedor creado', 'success'); await loadSuppliers(); } else { showToast('Error: ' + res.message, 'error'); }
}

async function deleteSupplier(id) { const res = await window.api.deleteSupplier(id); if (res.success) { showToast('Proveedor eliminado', 'success'); await loadSuppliers(); } else { showToast('Error: ' + res.message, 'error'); } }

// --- Purchases ---
let purchaseItems = [];

async function renderPurchases(container, actions) {
  actions.innerHTML = '<button class="btn btn-primary btn-sm" onclick="openPurchaseModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;margin-right:6px;vertical-align:middle;display:inline-block;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Nueva Compra</button>';
  container.innerHTML = `
    <div class="tabs"><div class="tab active" onclick="showPurchaseTab('compras', this)">Compras</div><div class="tab" onclick="showPurchaseTab('cxp', this)">Cuentas por Pagar</div></div>
    <div id="purchasesContent"></div>`;
  await showPurchaseTab('compras', document.querySelector('.tab.active'));
}

async function showPurchaseTab(tab, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const content = document.getElementById('purchasesContent');
  if (tab === 'compras') {
    const res = await window.api.getPurchases();
    if (!res.success || res.data.length === 0) { content.innerHTML = '<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:48px;height:48px;opacity:0.3;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></div><h3>Sin compras registradas</h3></div>'; return; }
    content.innerHTML = `<div class="table-container"><div class="table-wrapper"><table class="data-table"><thead><tr><th>Folio</th><th>Fecha</th><th>Proveedor</th><th>Total</th><th>Estado</th><th>Registró</th></tr></thead>
      <tbody>${res.data.map(c => `<tr><td><code>${c.folio}</code></td><td>${formatDate(c.fecha)}</td><td>${c.proveedor_nombre}</td><td class="text-accent font-bold font-mono">${formatCurrency(c.total)}</td>
        <td><span class="badge badge-${c.estado === 'Pagada' ? 'success' : 'warning'}">${c.estado}</span></td><td>${c.usuario_nombre || '-'}</td></tr>`).join('')}</tbody></table></div></div>`;
  } else {
    const res = await window.api.getPayables();
    if (!res.success || res.data.length === 0) { content.innerHTML = '<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:48px;height:48px;opacity:0.3;"><polyline points="20 6 9 17 4 12"></polyline></svg></div><h3>Sin cuentas pendientes</h3></div>'; return; }
    content.innerHTML = `<div class="table-container"><div class="table-wrapper"><table class="data-table"><thead><tr><th>Folio</th><th>Proveedor</th><th>Monto</th><th>Pagado</th><th>Pendiente</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${res.data.map(c => `<tr><td><code>${c.folio}</code></td><td>${c.proveedor_nombre}</td><td class="font-mono">${formatCurrency(c.monto)}</td><td class="font-mono">${formatCurrency(c.monto_pagado)}</td>
        <td class="text-danger font-bold font-mono">${formatCurrency(c.monto - c.monto_pagado)}</td><td><span class="badge badge-${c.estado === 'Pagada' ? 'success' : 'warning'}">${c.estado}</span></td>
        <td>${c.estado !== 'Pagada' ? `<button class="btn btn-sm btn-success" onclick="payAccount(${c.id}, ${c.monto - c.monto_pagado})">Pagar</button>` : '-'}</td></tr>`).join('')}</tbody></table></div></div>`;
  }
}

async function payAccount(id, pendiente) {
  openModal('Registrar Pago', `<div class="form-group"><label>Monto a pagar (Pendiente: ${formatCurrency(pendiente)})</label><input type="number" step="0.01" id="payAmount" value="${pendiente}" max="${pendiente}"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-success" onclick="confirmPay(${id})">Confirmar Pago</button>`);
}

async function confirmPay(id) {
  const monto = parseFloat(document.getElementById('payAmount').value);
  if (!monto || monto <= 0) { showToast('Ingrese un monto válido', 'warning'); return; }
  const res = await window.api.payPayable({ id, monto, usuario_id: currentUser.id });
  if (res.success) { closeModal(); showToast('Pago registrado', 'success'); await showPurchaseTab('cxp', document.querySelector('.tab:nth-child(2)')); } else { showToast('Error: ' + res.message, 'error'); }
}

async function openPurchaseModal() {
  purchaseItems = [];
  const supps = await window.api.getSuppliers();
  const prods = await window.api.getProducts({});
  const suppOpts = supps.success ? supps.data.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('') : '';
  const prodOpts = prods.success ? prods.data.map(p => `<option value="${p.id}" data-precio="${p.precio_compra}">${p.codigo} - ${p.nombre}</option>`).join('') : '';
  
  const body = `<div class="form-group"><label>Proveedor *</label><select id="purchSupp" required><option value="">Seleccionar...</option>${suppOpts}</select></div>
    <div class="form-group"><label>Notas</label><input type="text" id="purchNotas"></div>
    <hr style="border-color:var(--border-color);margin:16px 0">
    <h4 style="margin-bottom:12px">Productos</h4>
    <div class="form-row-3 mb-2"><div class="form-group"><label>Producto</label><select id="purchProd"><option value="">Seleccionar...</option>${prodOpts}</select></div>
    <div class="form-group"><label>Cantidad</label><input type="number" id="purchQty" value="1" min="1"></div>
    <div class="form-group"><label>Costo Unit.</label><input type="number" step="0.01" id="purchCost" value="0"></div></div>
    <button class="btn btn-sm btn-secondary mb-2" onclick="addPurchaseItem()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;margin-right:6px;vertical-align:middle;display:inline-block;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Agregar</button>
    <div id="purchItemsList"></div>
    <div class="cart-totals mt-2"><div class="total-line grand-total"><span>Total</span><span id="purchTotal" class="font-mono">$0.00</span></div></div>`;
  
  openModal('Nueva Compra a Proveedor', body,
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="savePurchase()">Registrar Compra</button>', true);
  
  document.getElementById('purchProd')?.addEventListener('change', function() {
    const opt = this.options[this.selectedIndex];
    if (opt.dataset.precio) document.getElementById('purchCost').value = opt.dataset.precio;
  });
}

function addPurchaseItem() {
  const sel = document.getElementById('purchProd');
  const prodId = parseInt(sel.value); if (!prodId) { showToast('Seleccione un producto', 'warning'); return; }
  const nombre = sel.options[sel.selectedIndex].textContent;
  const cantidad = parseInt(document.getElementById('purchQty').value) || 1;
  const costo = parseFloat(document.getElementById('purchCost').value) || 0;
  purchaseItems.push({ producto_id: prodId, nombre, cantidad, costo_unitario: costo, subtotal: cantidad * costo });
  renderPurchaseItems();
}

function renderPurchaseItems() {
  const container = document.getElementById('purchItemsList');
  container.innerHTML = purchaseItems.map((item, i) => `<div class="cart-item"><div class="item-info"><div class="name">${item.nombre}</div><div class="price">${item.cantidad} x ${formatCurrency(item.costo_unitario)}</div></div>
    <div class="item-total font-mono">${formatCurrency(item.subtotal)}</div><button class="remove-item" onclick="purchaseItems.splice(${i},1);renderPurchaseItems()">✕</button></div>`).join('');
  document.getElementById('purchTotal').textContent = formatCurrency(purchaseItems.reduce((s, i) => s + i.subtotal, 0));
}

async function savePurchase() {
  const provId = parseInt(document.getElementById('purchSupp').value);
  if (!provId) { showToast('Seleccione un proveedor', 'warning'); return; }
  if (purchaseItems.length === 0) { showToast('Agregue al menos un producto', 'warning'); return; }
  const total = purchaseItems.reduce((s, i) => s + i.subtotal, 0);
  const res = await window.api.createPurchase({ proveedor_id: provId, total, notas: document.getElementById('purchNotas').value.trim(), usuario_id: currentUser.id, items: purchaseItems });
  if (res.success) { closeModal(true); showToast(`Compra ${res.folio} registrada`, 'success'); navigateTo('purchases'); } else { showToast('Error: ' + res.message, 'error'); }
}
