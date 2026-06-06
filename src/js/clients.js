// modulo de clientes

async function renderClients(container, actions) {
  actions.innerHTML = '<button class="btn btn-primary btn-sm" onclick="openClientModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;margin-right:6px;vertical-align:middle;display:inline-block;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Nuevo Cliente</button>';
  container.innerHTML = `<div class="table-container">
    <div class="table-toolbar"><div class="search-box"><span class="search-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></span><input type="text" id="clientSearch" placeholder="Buscar cliente..." oninput="loadClients()"></div></div>
    <div class="table-wrapper"><table class="data-table"><thead><tr><th>Nombre</th><th>Teléfono</th><th>Email</th><th>Dirección</th><th>Registro</th><th>Acciones</th></tr></thead>
    <tbody id="clientsTableBody"></tbody></table></div></div>`;
  await loadClients();
}

async function loadClients() {
  const res = await window.api.getClients();
  const search = (document.getElementById('clientSearch')?.value || '').toLowerCase();
  const tbody = document.getElementById('clientsTableBody');
  if (!res.success) { tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${res.message}</td></tr>`; return; }
  let data = res.data;
  if (search) data = data.filter(c => c.nombre.toLowerCase().includes(search) || (c.telefono||'').includes(search) || (c.email||'').toLowerCase().includes(search));
  if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:40px">No hay clientes</td></tr>'; return; }
  tbody.innerHTML = data.map(c => `<tr>
    <td class="font-bold">${c.nombre}</td><td class="font-mono">${c.telefono || '-'}</td><td>${c.email || '-'}</td><td class="truncate" style="max-width:150px">${c.direccion || '-'}</td><td>${formatDate(c.fecha_registro)}</td>
    <td><div class="action-btns">
      <button class="action-btn" onclick="viewClientHistory(${c.id}, '${c.nombre.replace(/'/g,"\\'")}')" title="Historial"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></button>
      <button class="action-btn" onclick='openClientModal(${JSON.stringify(c).replace(/'/g,"&#39;")})' title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
      <button class="action-btn delete" onclick="deleteClient(${c.id})" title="Eliminar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
    </div></td></tr>`).join('');
}

function openClientModal(client = null) {
  const body = `<form><div class="form-group"><label>Nombre *</label><input type="text" id="cNombre" value="${client?.nombre || ''}" required></div>
    <div class="form-row"><div class="form-group"><label>Teléfono</label><input type="text" id="cTelefono" value="${client?.telefono || ''}"></div>
    <div class="form-group"><label>Email</label><input type="email" id="cEmail" value="${client?.email || ''}"></div></div>
    <div class="form-group"><label>Dirección</label><input type="text" id="cDireccion" value="${client?.direccion || ''}"></div>
    <div class="form-group"><label>Notas</label><textarea id="cNotas">${client?.notas || ''}</textarea></div></form>`;
  openModal(client ? 'Editar Cliente' : 'Nuevo Cliente', body,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveClient(${client?.id || 'null'})">${client ? 'Actualizar' : 'Guardar'}</button>`);
}

async function saveClient(id) {
  const data = { nombre: document.getElementById('cNombre').value.trim(), telefono: document.getElementById('cTelefono').value.trim(),
    email: document.getElementById('cEmail').value.trim(), direccion: document.getElementById('cDireccion').value.trim(), notas: document.getElementById('cNotas').value.trim() };
  if (!data.nombre) { showToast('El nombre es obligatorio', 'warning'); return; }
  let res; if (id) { data.id = id; res = await window.api.updateClient(data); } else { res = await window.api.createClient(data); }
  if (res.success) { closeModal(); showToast(id ? 'Cliente actualizado' : 'Cliente creado', 'success'); await loadClients(); } else { showToast('Error: ' + res.message, 'error'); }
}

async function deleteClient(id) {
  const res = await window.api.deleteClient(id);
  if (res.success) { showToast('Cliente eliminado', 'success'); await loadClients(); } else { showToast('Error: ' + res.message, 'error'); }
}

async function viewClientHistory(clienteId, nombre) {
  const res = await window.api.getClientHistory(clienteId);
  if (!res.success) { showToast('Error al cargar historial', 'error'); return; }
  let body = `<h3 style="margin-bottom:16px">Historial de ${nombre}</h3>`;
  body += `<h4 style="margin-bottom:8px">Compras (${res.ventas.length})</h4>`;
  if (res.ventas.length > 0) {
    body += `<table class="data-table"><thead><tr><th>Folio</th><th>Fecha</th><th>Total</th><th>Vendedor</th></tr></thead><tbody>${res.ventas.map(v => 
      `<tr><td><code>${v.folio}</code></td><td>${formatDate(v.fecha)}</td><td class="text-accent">${formatCurrency(v.total)}</td><td>${v.vendedor}</td></tr>`).join('')}</tbody></table>`;
  } else { body += '<p class="text-muted">Sin compras registradas</p>'; }
  body += `<h4 style="margin:16px 0 8px">Servicios Técnicos (${res.servicios.length})</h4>`;
  if (res.servicios.length > 0) {
    body += `<table class="data-table"><thead><tr><th>Folio</th><th>Fecha</th><th>Equipo</th><th>Estado</th><th>Costo</th></tr></thead><tbody>${res.servicios.map(s =>
      `<tr><td><code>${s.folio}</code></td><td>${formatDate(s.fecha_recepcion)}</td><td>${s.equipo_descripcion}</td><td>${s.estado}</td><td>${formatCurrency(s.costo_servicio)}</td></tr>`).join('')}</tbody></table>`;
  } else { body += '<p class="text-muted">Sin servicios registrados</p>'; }
  openModal(`Cliente: ${nombre}`, body, '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>', true);
}
