// modulo de usuarios e historial de auditoria

async function renderUsers(container, actions) {
  if (currentUser.rol !== 'Administrador') { container.innerHTML = '<div class="empty-state"><h3>Acceso Restringido</h3><p>Solo los administradores pueden gestionar usuarios.</p></div>'; return; }
  actions.innerHTML = '<button class="btn btn-primary btn-sm" onclick="openUserModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;margin-right:6px;vertical-align:middle;display:inline-block;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Nuevo Usuario</button>';
  container.innerHTML = `<div class="table-container">
    <div class="table-wrapper"><table class="data-table"><thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th>Registro</th><th>Acciones</th></tr></thead>
    <tbody id="usersTableBody"></tbody></table></div></div>`;
  await loadUsers();
}

async function loadUsers() {
  const res = await window.api.getUsers();
  const tbody = document.getElementById('usersTableBody');
  if (!res.success) { tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${res.message}</td></tr>`; return; }
  tbody.innerHTML = res.data.map(u => `<tr>
    <td class="font-bold">${u.nombre_completo}</td><td><code>${u.usuario}</code></td>
    <td><span class="badge badge-${u.rol === 'Administrador' ? 'purple' : 'info'}">${u.rol}</span></td>
    <td><span class="badge badge-${u.activo ? 'success' : 'danger'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
    <td class="font-mono">${formatDate(u.fecha_creacion)}</td>
    <td><div class="action-btns">
      <button class="action-btn" onclick="openUserModal({id:${u.id},nombre_completo:'${u.nombre_completo.replace(/'/g,"\\'")}',usuario:'${u.usuario}',rol:'${u.rol}'})" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
      <button class="action-btn ${u.activo ? 'delete' : ''}" onclick="toggleUser(${u.id}, ${!u.activo})" title="${u.activo ? 'Desactivar' : 'Activar'}">${u.activo ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>` : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`}</button>
    </div></td></tr>`).join('');
}

async function openUserModal(user = null) {
  const roles = await window.api.getRoles();
  const roleOpts = roles.success ? roles.data.map(r => `<option value="${r.id}" ${user && user.rol === r.nombre ? 'selected' : ''}>${r.nombre}</option>`).join('') : '';
  
  const body = `<form>
    <div class="form-group"><label>Nombre Completo *</label><input type="text" id="uNombre" value="${user?.nombre_completo || ''}" required></div>
    <div class="form-row"><div class="form-group"><label>Usuario *</label><input type="text" id="uUsuario" value="${user?.usuario || ''}" required></div>
    <div class="form-group"><label>Rol *</label><select id="uRol" required>${roleOpts}</select></div></div>
    <div class="form-group"><label>${user ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label><input type="password" id="uPassword" ${user ? '' : 'required'}></div>
    ${user ? '' : '<div class="form-group"><label>Confirmar Contraseña *</label><input type="password" id="uPassword2" required></div>'}
  </form>`;
  openModal(user ? 'Editar Usuario' : 'Nuevo Usuario', body,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveUser(${user?.id || 'null'})">${user ? 'Actualizar' : 'Crear'}</button>`);
}

async function saveUser(id) {
  const data = { nombre_completo: document.getElementById('uNombre').value.trim(), usuario: document.getElementById('uUsuario').value.trim(),
    rol_id: parseInt(document.getElementById('uRol').value), password: document.getElementById('uPassword').value };
  if (!data.nombre_completo || !data.usuario || !data.rol_id) { showToast('Complete los campos obligatorios', 'warning'); return; }
  if (!id && !data.password) { showToast('La contraseña es obligatoria', 'warning'); return; }
  if (!id) { const p2 = document.getElementById('uPassword2').value; if (data.password !== p2) { showToast('Las contraseñas no coinciden', 'warning'); return; } }
  
  let res; if (id) { data.id = id; res = await window.api.updateUser(data); } else { res = await window.api.createUser(data); }
  if (res.success) { closeModal(); showToast(id ? 'Usuario actualizado' : 'Usuario creado', 'success'); await loadUsers();
    await window.api.logAudit({ usuario_id: currentUser.id, accion: id ? 'EDITAR' : 'CREAR', tabla_afectada: 'Usuarios', registro_id: id || res.id, detalle: `Usuario: ${data.usuario}` });
  } else { showToast('Error: ' + res.message, 'error'); }
}

async function toggleUser(id, activo) {
  const res = await window.api.toggleUserActive({ id, activo });
  if (res.success) { showToast(activo ? 'Usuario activado' : 'Usuario desactivado', 'success'); await loadUsers(); }
  else { showToast('Error: ' + res.message, 'error'); }
}

// logs de auditoria
async function renderAudit(container) {
  if (currentUser.rol !== 'Administrador') { container.innerHTML = '<div class="empty-state"><h3>Acceso Restringido</h3></div>'; return; }
  const today = new Date().toISOString().split('T')[0];
  container.innerHTML = `<div class="table-container">
    <div class="table-toolbar">
      <div class="filters">
        <label style="font-size:13px;color:var(--text-secondary)">Desde:</label><input type="date" id="auditFrom" class="filter-btn" value="${today}">
        <label style="font-size:13px;color:var(--text-secondary)">Hasta:</label><input type="date" id="auditTo" class="filter-btn" value="${today}">
        <button class="btn btn-sm btn-primary" onclick="loadAudit()">Filtrar</button>
      </div>
    </div>
    <div class="table-wrapper"><table class="data-table"><thead><tr><th>Fecha/Hora</th><th>Usuario</th><th>Acción</th><th>Tabla</th><th>Registro</th><th>Detalle</th></tr></thead>
    <tbody id="auditTableBody"></tbody></table></div></div>`;
  await loadAudit();
}

async function loadAudit() {
  const filters = {};
  const from = document.getElementById('auditFrom')?.value;
  const to = document.getElementById('auditTo')?.value;
  if (from) filters.fechaInicio = from;
  if (to) filters.fechaFin = to;
  
  const res = await window.api.getAuditLog(filters);
  const tbody = document.getElementById('auditTableBody');
  if (!res.success || res.data.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:40px">Sin registros de auditoría</td></tr>'; return; }
  
  const actionBadge = (a) => {
    const colors = { 'LOGIN': 'info', 'CREAR': 'success', 'EDITAR': 'warning', 'ELIMINAR': 'danger', 'VENTA': 'success' };
    return `<span class="badge badge-${colors[a] || 'info'}">${a}</span>`;
  };
  
  tbody.innerHTML = res.data.map(a => `<tr>
    <td class="font-mono">${formatDateTime(a.fecha)}</td><td class="font-bold">${a.usuario_nombre}</td><td>${actionBadge(a.accion)}</td>
    <td>${a.tabla_afectada}</td><td class="font-mono">${a.registro_id || '-'}</td><td class="truncate" style="max-width:200px" title="${a.detalle || ''}">${a.detalle || '-'}</td></tr>`).join('');
}
