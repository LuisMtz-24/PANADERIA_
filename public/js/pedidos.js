let allPedidos = [];

async function checkAuth() {
  try {
    const response = await fetch('/api/auth/session');
    const data = await response.json();
    
    if (!data.authenticated) {
      window.location.href = 'login.html';
      return;
    }
    
    document.getElementById('userName').textContent = data.user.nombre;
    loadPedidos();
  } catch (error) {
    console.error('Error:', error);
    window.location.href = 'login.html';
  }
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = 'index.html';
}

async function loadPedidos() {
  const tbody = document.querySelector('#tablaPedidos tbody');
  tbody.innerHTML = '<tr><td colspan="7" class="loading">Cargando...</td></tr>';
  
  try {
    const response = await fetch('/api/pedidos');
    if (!response.ok) throw new Error('Error');
    
    allPedidos = await response.json();
    renderPedidos(allPedidos);
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al cargar pedidos', 'error');
  }
}

function renderPedidos(pedidos) {
  const tbody = document.querySelector('#tablaPedidos tbody');
  
  if (pedidos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay pedidos</td></tr>';
    return;
  }
  
  tbody.innerHTML = pedidos.map(p => `
    <tr>
      <td>#${p.ID_Pedido}</td>
      <td>${p.Cliente} ${p.Apellido || ''}</td>
      <td>${formatearFecha(p.Fecha)}</td>
      <td>${p.Total_productos || 0} items</td>
      <td>${formatearPrecio(p.Total || 0)}</td>
      <td><span class="badge badge-${getEstadoClass(p.Estado_Actual)}">${p.Estado_Actual || 'Pendiente'}</span></td>
      <td>
        <button onclick="verPedido(${p.ID_Pedido})" class="btn-small">Ver</button>
        ${p.Estado_Actual !== 'Entregado' && p.Estado_Actual !== 'Cancelado' ? 
          `<button onclick="updateEstadoPedido(${p.ID_Pedido})" class="btn-small" style="background: #2196f3; margin-left: 5px;">Estado</button>` : ''
        }
        ${p.Estado_Actual !== 'Entregado' && p.Estado_Actual !== 'Cancelado' ? 
          `<button onclick="cancelarPedido(${p.ID_Pedido})" class="btn-small" style="background: #f44336; margin-left: 5px;">Cancelar</button>` : ''
        }
      </td>
    </tr>
  `).join('');
}

function getEstadoClass(estado) {
  const estados = {
    'Pendiente': 'warning',
    'En Preparación': 'info',
    'En Camino': 'primary',
    'Entregado': 'success',
    'Cancelado': 'danger'
  };
  return estados[estado] || 'secondary';
}

async function verPedido(id) {
  try {
    const response = await fetch(`/api/pedidos/${id}`);
    if (!response.ok) throw new Error('Error');
    
    const pedido = await response.json();
    
    const detallesHTML = `
      <div style="padding: 20px; color: var(--color-light);">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
          <div>
            <h3 style="color: var(--color-accent); margin-bottom: 15px;">Cliente</h3>
            <p>👤 ${pedido.Cliente_Nombre} ${pedido.Cliente_Apellido || ''}</p>
            <p>📧 ${pedido.Cliente_Correo}</p>
            <p>📱 ${pedido.Cliente_Telefono || 'N/A'}</p>
          </div>
          <div>
            <h3 style="color: var(--color-accent); margin-bottom: 15px;">Dirección de Entrega</h3>
            <p>🏠 ${pedido.Calle || 'N/A'}</p>
            <p>🏙️ ${pedido.Ciudad || 'N/A'}</p>
            <p>📮 ${pedido.Código_Postal || 'N/A'}</p>
            <p>🌎 ${pedido.País || 'N/A'}</p>
          </div>
        </div>
        
        <h3 style="color: var(--color-accent); margin-bottom: 15px;">productos</h3>
        <table style="width: 100%; margin-bottom: 30px;">
          <thead>
            <tr style="background: rgba(255, 149, 0, 0.2);">
              <th style="padding: 10px; text-align: left;">producto</th>
              <th style="padding: 10px; text-align: center;">Cantidad</th>
              <th style="padding: 10px; text-align: right;">Precio</th>
              <th style="padding: 10px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${pedido.detalles.map(d => `
              <tr style="border-bottom: 1px solid rgba(255, 149, 0, 0.1);">
                <td style="padding: 10px;">${d.producto}</td>
                <td style="padding: 10px; text-align: center;">${d.Cantidad}</td>
                <td style="padding: 10px; text-align: right;">${formatearPrecio(d.Precio_Unitario)}</td>
                <td style="padding: 10px; text-align: right;">${formatearPrecio(d.Cantidad * d.Precio_Unitario)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="text-align: right; padding: 20px; background: rgba(255, 149, 0, 0.1); border-radius: 10px; margin-bottom: 30px;">
          <p style="margin: 5px 0;">Subtotal: ${formatearPrecio(pedido.Subtotal || 0)}</p>
          <p style="margin: 5px 0;">Envío: ${formatearPrecio(pedido.Tarifas_de_Envío || 0)}</p>
          <h3 style="color: var(--color-accent); margin: 10px 0 0;">Total: ${formatearPrecio(pedido.Total || 0)}</h3>
        </div>
        
        <h3 style="color: var(--color-accent); margin-bottom: 15px;">Seguimiento</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${pedido.seguimiento.map(s => `
            <div style="padding: 15px; background: rgba(255, 149, 0, 0.1); border-left: 4px solid var(--color-accent); border-radius: 8px;">
              <strong>${s.Estado}</strong>
              <p style="opacity: 0.8; margin: 5px 0;">${formatearFecha(s.Fecha)}</p>
              ${s.Detalles ? `<p style="opacity: 0.9;">${s.Detalles}</p>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    document.getElementById('pedidoDetalles').innerHTML = detallesHTML;
    document.getElementById('pedidoModal').style.display = 'block';
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al cargar detalles', 'error');
  }
}

function closeModal() {
  document.getElementById('pedidoModal').style.display = 'none';
}

async function updateEstadoPedido(id) {
  const estados = [
    { id: 1, nombre: 'Pendiente' },
    { id: 2, nombre: 'En Preparación' },
    { id: 3, nombre: 'En Camino' },
    { id: 4, nombre: 'Entregado' }
  ];
  
  const opciones = estados.map(e => `${e.id}. ${e.nombre}`).join('\n');
  const seleccion = prompt(`Seleccione el nuevo estado:\n\n${opciones}\n\nIngrese el número:`);
  
  if (!seleccion) return;
  
  const estadoId = parseInt(seleccion);
  if (estadoId < 1 || estadoId > 4) {
    mostrarMensaje('Estado inválido', 'error');
    return;
  }
  
  const detalles = prompt('Detalles del cambio de estado (opcional):');
  
  try {
    const response = await fetch(`/api/pedidos/${id}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado_id: estadoId, detalles })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      mostrarMensaje('Estado actualizado', 'success');
      loadPedidos();
    } else {
      mostrarMensaje(result.message || 'Error', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al actualizar estado', 'error');
  }
}

async function cancelarPedido(id) {
  if (!confirmarAccion('¿Estás seguro de cancelar este pedido?')) return;
  
  const motivo = prompt('Motivo de cancelación:');
  
  try {
    const response = await fetch(`/api/pedidos/${id}/cancelar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      mostrarMensaje('Pedido cancelado', 'success');
      loadPedidos();
    } else {
      mostrarMensaje(result.message || 'Error', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al cancelar pedido', 'error');
  }
}

function filterByEstado() {
  const estado = document.getElementById('filterEstado').value;
  
  if (!estado) {
    renderPedidos(allPedidos);
    return;
  }
  
  const filtered = allPedidos.filter(p => p.Estado_Actual === estado);
  renderPedidos(filtered);
}

document.getElementById('searchPedidos')?.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const rows = document.querySelectorAll('#tablaPedidos tbody tr');
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(term) ? '' : 'none';
  });
});

checkAuth();