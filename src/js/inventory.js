// modulo de inventario

async function renderInventory(container, actions) {
  actions.innerHTML = '<button class="btn btn-primary btn-sm" onclick="openProductModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;margin-right:6px;vertical-align:middle;display:inline-block;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Nuevo Producto</button>';
  container.innerHTML = `
    <div class="table-container">
      <div class="table-toolbar">
        <div class="search-box"><span class="search-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></span><input type="text" id="invSearch" placeholder="Buscar producto..." oninput="filterInventory()"></div>
        <div class="filters">
          <select id="invCatFilter" class="filter-btn" onchange="filterInventory()"><option value="">Todas las categorías</option></select>
          <button class="filter-btn" id="lowStockFilter" onclick="toggleLowStock()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;margin-right:6px;vertical-align:middle;display:inline-block;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>Stock Bajo</button>
        </div>
      </div>
      <div class="table-wrapper"><table class="data-table"><thead><tr>
        <th>Código</th><th>Nombre</th><th>Categoría</th><th>P. Compra</th><th>P. Venta</th><th>Stock</th><th>Mín</th><th>Proveedor</th><th>Acciones</th>
      </tr></thead><tbody id="invTableBody"></tbody></table></div>
    </div>`;
  
  // cargar categorias en el filtro
  const cats = await window.api.getCategories();
  if (cats.success) {
    const sel = document.getElementById('invCatFilter');
    cats.data.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.nombre; sel.appendChild(o); });
  }
  await filterInventory();
}

let _showLowStock = false;
function toggleLowStock() {
  _showLowStock = !_showLowStock;
  document.getElementById('lowStockFilter').classList.toggle('active', _showLowStock);
  filterInventory();
}

async function filterInventory() {
  const search = document.getElementById('invSearch')?.value || '';
  const catId = document.getElementById('invCatFilter')?.value || '';
  const filters = { search };
  if (catId) filters.categoria_id = parseInt(catId);
  if (_showLowStock) filters.lowStock = true;
  
  const res = await window.api.getProducts(filters);
  const tbody = document.getElementById('invTableBody');
  if (!res.success) { tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">${res.message}</td></tr>`; return; }
  if (res.data.length === 0) { tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted" style="padding:40px">No se encontraron productos</td></tr>'; return; }
  
  tbody.innerHTML = res.data.map(p => `<tr>
    <td><code>${p.codigo}</code></td>
    <td class="font-bold">${p.nombre}</td>
    <td><span class="badge badge-purple">${p.categoria_nombre || '-'}</span></td>
    <td class="font-mono">${formatCurrency(p.precio_compra)}</td>
    <td class="text-accent font-bold font-mono">${formatCurrency(p.precio_venta)}</td>
    <td class="${p.stock_actual <= p.stock_minimo ? 'low-stock font-bold' : ''} font-mono">${p.stock_actual}</td>
    <td class="font-mono">${p.stock_minimo}</td>
    <td class="text-muted">${p.proveedor_nombre || '-'}</td>
    <td><div class="action-btns">
      <button class="action-btn" onclick='openProductModal(${JSON.stringify(p).replace(/'/g,"&#39;")})' title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
      <button class="action-btn delete" onclick="deleteProduct(${p.id}, '${p.nombre.replace(/'/g,"\\'")}')" title="Eliminar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
    </div></td>
  </tr>`).join('');
}

async function openProductModal(product = null) {
  const cats = await window.api.getCategories();
  const supps = await window.api.getSuppliers();
  const catOptions = cats.success ? cats.data.map(c => `<option value="${c.id}" ${product && product.categoria_id === c.id ? 'selected' : ''}>${c.nombre}</option>`).join('') : '';
  const suppOptions = supps.success ? supps.data.map(s => `<option value="${s.id}" ${product && product.proveedor_id === s.id ? 'selected' : ''}>${s.nombre}</option>`).join('') : '';
  
  const body = `<form id="productForm">
    <div class="form-row"><div class="form-group"><label>Código *</label><input type="text" id="pCodigo" value="${product?.codigo || ''}" required></div>
    <div class="form-group"><label>Categoría *</label><select id="pCategoria" required><option value="">Seleccionar...</option>${catOptions}</select></div></div>
    <div class="form-group"><label>Nombre *</label><input type="text" id="pNombre" value="${product?.nombre || ''}" required></div>
    <div class="form-group"><label>Descripción</label><textarea id="pDescripcion">${product?.descripcion || ''}</textarea></div>
    <div class="form-row-3"><div class="form-group"><label>P. Compra</label><input type="number" step="0.01" id="pPrecioCompra" value="${product?.precio_compra || 0}"></div>
    <div class="form-group"><label>P. Venta *</label><input type="number" step="0.01" id="pPrecioVenta" value="${product?.precio_venta || ''}" required></div>
    <div class="form-group"><label>Garantía (meses)</label><input type="number" id="pGarantia" value="${product?.garantia_meses || 0}"></div></div>
    <div class="form-row-3"><div class="form-group"><label>Stock Actual</label><input type="number" id="pStock" value="${product?.stock_actual || 0}"></div>
    <div class="form-group"><label>Stock Mínimo</label><input type="number" id="pStockMin" value="${product?.stock_minimo || 5}"></div>
    <div class="form-group"><label>Proveedor</label><select id="pProveedor"><option value="">Ninguno</option>${suppOptions}</select></div></div>
  </form>`;
  
  const footer = `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveProduct(${product?.id || 'null'})">${product ? 'Actualizar' : 'Guardar'}</button>`;
  
  openModal(product ? 'Editar Producto' : 'Nuevo Producto', body, footer);
}

async function saveProduct(id) {
  const data = {
    codigo: document.getElementById('pCodigo').value.trim(),
    nombre: document.getElementById('pNombre').value.trim(),
    descripcion: document.getElementById('pDescripcion').value.trim(),
    categoria_id: parseInt(document.getElementById('pCategoria').value),
    precio_compra: parseFloat(document.getElementById('pPrecioCompra').value) || 0,
    precio_venta: parseFloat(document.getElementById('pPrecioVenta').value),
    stock_actual: parseInt(document.getElementById('pStock').value) || 0,
    stock_minimo: parseInt(document.getElementById('pStockMin').value) || 5,
    proveedor_id: document.getElementById('pProveedor').value ? parseInt(document.getElementById('pProveedor').value) : null,
    garantia_meses: parseInt(document.getElementById('pGarantia').value) || 0
  };
  if (!data.codigo || !data.nombre || !data.categoria_id || !data.precio_venta) { showToast('Complete los campos obligatorios', 'warning'); return; }
  
  let res;
  if (id) { data.id = id; res = await window.api.updateProduct(data); }
  else { res = await window.api.createProduct(data); }
  
  if (res.success) { closeModal(); showToast(id ? 'Producto actualizado' : 'Producto creado', 'success'); await filterInventory();
    await window.api.logAudit({ usuario_id: currentUser.id, accion: id ? 'EDITAR' : 'CREAR', tabla_afectada: 'Productos', registro_id: id || res.id, detalle: `Producto: ${data.nombre}` });
  } else { showToast('Error: ' + res.message, 'error'); }
}

async function deleteProduct(id, nombre) {
  openModal('Confirmar Eliminación', `<p>¿Está seguro de eliminar el producto <strong>${nombre}</strong>?</p><p class="text-muted mt-1">El producto será desactivado del catálogo.</p>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-danger" onclick="confirmDeleteProduct(${id})">Eliminar</button>`);
}

async function confirmDeleteProduct(id) {
  const res = await window.api.deleteProduct(id);
  if (res.success) { closeModal(); showToast('Producto eliminado', 'success'); await filterInventory();
    await window.api.logAudit({ usuario_id: currentUser.id, accion: 'ELIMINAR', tabla_afectada: 'Productos', registro_id: id, detalle: 'Producto eliminado (desactivado)' });
  } else { showToast('Error: ' + res.message, 'error'); }
}
