// rastreador de ordenes de servicio
async function trackServiceOrder() {
  const input = document.getElementById('trackFolio');
  const folio = input.value.trim().toUpperCase();
  
  if (!folio) {
    showToast('Ingrese un folio de servicio técnico', 'warning');
    return;
  }
  
  const btn = document.getElementById('trackBtn');
  btn.disabled = true;
  btn.textContent = 'Buscando...';
  
  const resultCard = document.getElementById('trackResult');
  resultCard.classList.remove('active');
  
  try {
    const response = await fetch(`/api/public/workshop/track/${folio}`);
    const res = await response.json();
    
    if (res.success) {
      const order = res.data;
      
      // Populate fields
      document.getElementById('resFolio').textContent = `Folio: ${order.folio}`;
      document.getElementById('resStatus').textContent = order.estado;
      
      // Aplicar colores según el estado de la orden
      const statusBadge = document.getElementById('resStatus');
      statusBadge.className = 'badge';
      if (order.estado === 'Cancelado') {
        statusBadge.classList.add('badge-danger');
      } else if (order.estado === 'Terminado' || order.estado === 'Entregado') {
        statusBadge.classList.add('badge-success');
      } else {
        statusBadge.classList.add('badge-info');
      }
      
      document.getElementById('resCliente').textContent = order.cliente_nombre || 'N/A';
      document.getElementById('resFecha').textContent = formatDate(order.fecha_recepcion);
      document.getElementById('resEquipo').textContent = order.equipo_descripcion;
      document.getElementById('resFalla').textContent = order.falla_reportada;
      document.getElementById('resDiagnostico').textContent = order.diagnostico || 'Pendiente de diagnóstico';
      document.getElementById('resPiezas').textContent = order.piezas_reemplazadas || '-';
      document.getElementById('resCosto').textContent = order.costo_servicio > 0 ? formatCurrency(order.costo_servicio) : '-';
      
      // Update Stepper Progress
      updateStepper(order.estado);
      
      // Show card
      resultCard.classList.add('active');
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    showToast('Error al conectar con el servidor', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Buscar Folio';
  }
}

function updateStepper(estado) {
  const steps = {
    recibido: document.getElementById('stepRecibido'),
    diagnostico: document.getElementById('stepDiagnostico'),
    reparacion: document.getElementById('stepReparacion'),
    terminado: document.getElementById('stepTerminado'),
    entregado: document.getElementById('stepEntregado')
  };
  
  // Reset all steps classes
  Object.values(steps).forEach(s => {
    s.className = 'step-item';
  });
  
  if (estado === 'Cancelado') {
    Object.values(steps).forEach(s => {
      s.classList.add('cancelled');
    });
    return;
  }
  
  switch(estado) {
    case 'Recibido':
      steps.recibido.classList.add('active');
      break;
    case 'En Diagnóstico':
      steps.recibido.classList.add('completed');
      steps.diagnostico.classList.add('active');
      break;
    case 'En Reparación':
      steps.recibido.classList.add('completed');
      steps.diagnostico.classList.add('completed');
      steps.reparacion.classList.add('active');
      break;
    case 'Terminado':
      steps.recibido.classList.add('completed');
      steps.diagnostico.classList.add('completed');
      steps.reparacion.classList.add('completed');
      steps.terminado.classList.add('active');
      break;
    case 'Entregado':
      steps.recibido.classList.add('completed');
      steps.diagnostico.classList.add('completed');
      steps.reparacion.classList.add('completed');
      steps.terminado.classList.add('completed');
      steps.entregado.classList.add('completed');
      break;
  }
}

// Allow Enter key on input to trigger search
document.getElementById('trackFolio').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    trackServiceOrder();
  }
});
