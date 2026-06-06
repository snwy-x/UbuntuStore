// modulo de taller y soporte

async function renderWorkshop(container, actions) {
  if (currentUser.rol !== 'Cliente') {
    actions.innerHTML = '<button class="btn btn-primary btn-sm" onclick="openServiceOrderModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;margin-right:6px;vertical-align:middle;display:inline-block;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Nueva Orden</button>';
  }
  container.innerHTML = `
    <div class="table-container">
      <div class="table-toolbar">
        <div class="filters">
          <button class="filter-btn active" onclick="filterWorkshop('')" id="wsAll">Todas</button>
          <button class="filter-btn" onclick="filterWorkshop('Recibido')" id="wsRecibido">Recibido</button>
          <button class="filter-btn" onclick="filterWorkshop('En Diagnóstico')" id="wsDiag">Diagnóstico</button>
          <button class="filter-btn" onclick="filterWorkshop('En Reparación')" id="wsRep">Reparación</button>
          <button class="filter-btn" onclick="filterWorkshop('Terminado')" id="wsTerm">Terminado</button>
          <button class="filter-btn" onclick="filterWorkshop('Entregado')" id="wsEnt">Entregado</button>
        </div>
      </div>
      <div class="table-wrapper"><table class="data-table"><thead><tr>
        <th>Folio</th><th>Fecha</th><th>Cliente</th><th>Equipo</th><th>Falla</th><th>Técnico</th><th>Estado</th><th>Costo</th><th>Acciones</th>
      </tr></thead><tbody id="wsTableBody"></tbody></table></div>
    </div>`;
  await filterWorkshop('');
}

let _wsEstado = '';
async function filterWorkshop(estado) {
  _wsEstado = estado;
  document.querySelectorAll('[id^="ws"]').forEach(b => { if (b.classList.contains('filter-btn')) b.classList.remove('active'); });
  const btnId = estado === '' ? 'wsAll' : estado === 'Recibido' ? 'wsRecibido' : estado === 'En Diagnóstico' ? 'wsDiag' : estado === 'En Reparación' ? 'wsRep' : estado === 'Terminado' ? 'wsTerm' : 'wsEnt';
  document.getElementById(btnId)?.classList.add('active');
  
  const params = estado ? { estado } : {};
  if (currentUser.rol === 'Cliente') {
    params.cliente_usuario = currentUser.usuario;
  }
  const res = await window.api.getServiceOrders(params);
  const tbody = document.getElementById('wsTableBody');
  if (!res.success || res.data.length === 0) { tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted" style="padding:40px">No hay órdenes de servicio</td></tr>'; return; }
  
  const statusBadge = (s) => {
    const colors = { 'Recibido': 'info', 'En Diagnóstico': 'warning', 'En Reparación': 'purple', 'Terminado': 'success', 'Entregado': 'success', 'Cancelado': 'danger' };
    return `<span class="badge badge-${colors[s] || 'info'}">${s}</span>`;
  };
  
  tbody.innerHTML = res.data.map(o => `<tr>
    <td><code>${o.folio}</code></td><td>${formatDate(o.fecha_recepcion)}</td><td>${o.cliente_nombre || '-'}</td>
    <td>${o.equipo_descripcion}</td><td class="truncate" style="max-width:150px" title="${o.falla_reportada}">${o.falla_reportada}</td>
    <td>${o.tecnico_nombre || 'Sin asignar'}</td><td>${statusBadge(o.estado)}</td>
    <td class="font-mono">${o.costo_servicio > 0 ? formatCurrency(o.costo_servicio) : '-'}</td>
    <td><div class="action-btns">
      <button class="action-btn" onclick="viewServiceOrder(${o.id})" title="${currentUser.rol === 'Cliente' ? 'Ver detalle' : 'Ver/Editar'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
    </div></td></tr>`).join('');
}

async function openServiceOrderModal() {
  const clients = await window.api.getClients();
  const users = await window.api.getUsers();
  const clientOpts = clients.success ? clients.data.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('') : '';
  const techOpts = users.success ? users.data.map(u => `<option value="${u.id}">${u.nombre_completo}</option>`).join('') : '';
  
  const body = `<form id="soForm">
    <div class="form-group"><label>Cliente</label><select id="soCliente"><option value="">Seleccionar...</option>${clientOpts}</select></div>
    <div class="form-group"><label>Descripción del Equipo *</label><input type="text" id="soEquipo" placeholder="Ej: Laptop HP Pavilion 15" required></div>
    <div class="form-group"><label>Falla Reportada *</label><textarea id="soFalla" placeholder="Describa el problema..." required></textarea></div>
    <div class="form-group"><label>Técnico Asignado</label><select id="soTecnico"><option value="">Sin asignar</option>${techOpts}</select></div>
    <div class="form-group"><label>Notas</label><textarea id="soNotas" placeholder="Notas adicionales..."></textarea></div>
  </form>`;
  
  openModal('Nueva Orden de Servicio', body, 
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveServiceOrder()">Crear Orden</button>');
}

async function saveServiceOrder() {
  const data = {
    cliente_id: document.getElementById('soCliente').value ? parseInt(document.getElementById('soCliente').value) : null,
    equipo_descripcion: document.getElementById('soEquipo').value.trim(),
    falla_reportada: document.getElementById('soFalla').value.trim(),
    tecnico_id: document.getElementById('soTecnico').value ? parseInt(document.getElementById('soTecnico').value) : null,
    notas: document.getElementById('soNotas').value.trim()
  };
  if (!data.equipo_descripcion || !data.falla_reportada) { showToast('Complete los campos obligatorios', 'warning'); return; }
  
  const res = await window.api.createServiceOrder(data);
  if (res.success) { closeModal(); showToast(`Orden ${res.folio} creada`, 'success'); await filterWorkshop(_wsEstado);
    await window.api.logAudit({ usuario_id: currentUser.id, accion: 'CREAR', tabla_afectada: 'OrdenesServicio', registro_id: res.id, detalle: `Orden ${res.folio}: ${data.equipo_descripcion}` });
  } else { showToast('Error: ' + res.message, 'error'); }
}

async function viewServiceOrder(id) {
  const res = await window.api.getServiceOrders({});
  const order = res.data.find(o => o.id === id);
  if (!order) { showToast('Orden no encontrada', 'error'); return; }
  
  let body, footer;
  if (currentUser.rol === 'Cliente') {
    body = `<div style="margin-bottom:16px"><strong>Folio:</strong> ${order.folio} | <strong>Fecha:</strong> ${formatDate(order.fecha_recepcion)}</div>
      <div style="margin-bottom:16px;padding:12px;background:var(--bg-input);border-radius:var(--radius-md)"><strong>Equipo:</strong> ${order.equipo_descripcion}<br><strong>Falla:</strong> ${order.falla_reportada}</div>
      <div class="form-row">
        <div class="form-group"><label>Estado</label><span class="badge badge-info" style="display:inline-block">${order.estado}</span></div>
        <div class="form-group"><label>Técnico</label><span>${order.tecnico_nombre || 'Sin asignar'}</span></div>
      </div>
      <div class="form-group"><label>Diagnóstico</label><div style="padding:10px;background:var(--bg-input);border-radius:var(--radius-md);font-style:italic">${order.diagnostico || 'Pendiente de diagnóstico'}</div></div>
      <div class="form-group"><label>Piezas Reemplazadas</label><div>${order.piezas_reemplazadas || '-'}</div></div>
      <div class="form-row"><div class="form-group"><label>Costo del Servicio</label><span class="font-mono font-bold text-accent" style="font-size:16px">${formatCurrency(order.costo_servicio)}</span></div></div>
      <div class="form-group"><label>Notas</label><div>${order.notas || '-'}</div></div>`;
    footer = `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>`;
  } else {
    const users = await window.api.getUsers();
    const techOpts = users.success ? users.data.map(u => `<option value="${u.id}" ${order.tecnico_id === u.id ? 'selected' : ''}>${u.nombre_completo}</option>`).join('') : '';
    const estados = ['Recibido', 'En Diagnóstico', 'En Reparación', 'Terminado', 'Entregado', 'Cancelado'];
    const estadoOpts = estados.map(e => `<option value="${e}" ${order.estado === e ? 'selected' : ''}>${e}</option>`).join('');
    
    body = `<div style="margin-bottom:16px"><strong>Folio:</strong> ${order.folio} | <strong>Fecha:</strong> ${formatDate(order.fecha_recepcion)} | <strong>Cliente:</strong> ${order.cliente_nombre || 'N/A'}</div>
      <div style="margin-bottom:16px;padding:12px;background:var(--bg-input);border-radius:var(--radius-md)"><strong>Equipo:</strong> ${order.equipo_descripcion}<br><strong>Falla:</strong> ${order.falla_reportada}</div>
      <div class="form-row"><div class="form-group"><label>Estado</label><select id="soEditEstado">${estadoOpts}</select></div>
      <div class="form-group"><label>Técnico</label><select id="soEditTecnico"><option value="">Sin asignar</option>${techOpts}</select></div></div>
      <div class="form-group"><label>Diagnóstico</label><textarea id="soEditDiag">${order.diagnostico || ''}</textarea></div>
      <div class="form-group"><label>Piezas Reemplazadas</label><textarea id="soEditPiezas">${order.piezas_reemplazadas || ''}</textarea></div>
      <div class="form-row"><div class="form-group"><label>Costo del Servicio</label><input type="number" step="0.01" id="soEditCosto" value="${order.costo_servicio || 0}"></div></div>
      <div class="form-group"><label>Notas</label><textarea id="soEditNotas">${order.notas || ''}</textarea></div>`;
    footer = `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="updateServiceOrder(${id})">Actualizar</button>`;
  }
  
  openModal(`Orden ${order.folio}`, body, footer);
}

async function updateServiceOrder(id) {
  const data = {
    id, estado: document.getElementById('soEditEstado').value,
    tecnico_id: document.getElementById('soEditTecnico').value ? parseInt(document.getElementById('soEditTecnico').value) : null,
    diagnostico: document.getElementById('soEditDiag').value.trim(),
    piezas_reemplazadas: document.getElementById('soEditPiezas').value.trim(),
    costo_servicio: parseFloat(document.getElementById('soEditCosto').value) || 0,
    notas: document.getElementById('soEditNotas').value.trim()
  };
  const res = await window.api.updateServiceOrder(data);
  if (res.success) { closeModal(); showToast('Orden actualizada', 'success'); await filterWorkshop(_wsEstado);
    await window.api.logAudit({ usuario_id: currentUser.id, accion: 'EDITAR', tabla_afectada: 'OrdenesServicio', registro_id: id, detalle: `Estado: ${data.estado}` });
  } else { showToast('Error: ' + res.message, 'error'); }
}
