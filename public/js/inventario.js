async function checkAuth() {
  try {
    const response = await fetch('/api/auth/session');
    const data = await response.json();
    
    if (!data.authenticated) {
      window.location.href = 'login.html';
      return;
    }
    
    document.getElementById('userName').textContent = data.user.nombre;
    loadinventario();
    loadproductosSelect();
  } catch (error) {
    console.error('Error:', error);
    window.location.href = 'login.html';
  }
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = 'index.html';
}

async function loadinventario() {
  const tbody = document.querySelector('#tablainventario tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading">Cargando...</td></tr>';
  
  try {
    const response = await fetch('/api/inventario');
    if (!response.ok) throw new Error('Error');
    
    const inventario = await response.json();
    
    if (inventario.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay inventario</td></tr>';
      return;
    }
    
    tbody.innerHTML = inventario.map(item => {
      const disponible = item.Disponible;
      const stockClass = disponible < 10 ? 'color: #f44336;' : disponible < 30 ? 'color: #ff9800;' : 'color: #4caf50;';
      
      return `
        <tr>
          <td>${item.producto}</td>
          <td>${item.Cantidad_Actual}</td>
          <td style="color: #ff9800;">${item.Cantidad_Reservada}</td>
          <td style="${stockClass} font-weight: bold;">${disponible}</td>
          <td>${formatearFecha(item.Ultima_Actualización)}</td>
          <td>
            <button onclick="verMovimientos(${item.idproducto})" class="btn-small">Historial</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al cargar inventario', 'error');
  }
}

async function loadproductosSelect() {
  try {
    const response = await fetch('/api/productos');
    const productos = await response.json();
    
    const optionsHTML = productos.map(p => 
      `<option value="${p.idproducto}">${p.Nombre}</option>`
    ).join('');
    
    document.getElementById('entradaproducto').innerHTML = 
      '<option value="">Seleccione un producto</option>' + optionsHTML;
    document.getElementById('salidaproducto').innerHTML = 
      '<option value="">Seleccione un producto</option>' + optionsHTML;
  } catch (error) {
    console.error('Error:', error);
  }
}

function showEntradaModal() {
  document.getElementById('entradaForm').reset();
  document.getElementById('entradaModal').style.display = 'block';
}

function showSalidaModal() {
  document.getElementById('salidaForm').reset();
  document.getElementById('salidaModal').style.display = 'block';
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

document.getElementById('entradaForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const data = {
    producto_id: parseInt(document.getElementById('entradaproducto').value),
    cantidad: parseInt(document.getElementById('entradaCantidad').value)
  };
  
  if (!data.producto_id || !data.cantidad || data.cantidad <= 0) {
    mostrarMensaje('Datos inválidos', 'error');
    return;
  }
  
  try {
    const response = await fetch('/api/inventario/entrada', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      mostrarMensaje('Entrada registrada exitosamente', 'success');
      closeModal('entradaModal');
      loadinventario();
    } else {
      mostrarMensaje(result.message || 'Error', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al registrar entrada', 'error');
  }
});

document.getElementById('salidaForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const data = {
    producto_id: parseInt(document.getElementById('salidaproducto').value),
    cantidad: parseInt(document.getElementById('salidaCantidad').value),
    referencia: document.getElementById('salidaReferencia').value.trim()
  };
  
  if (!data.producto_id || !data.cantidad || data.cantidad <= 0) {
    mostrarMensaje('Datos inválidos', 'error');
    return;
  }
  
  try {
    const response = await fetch('/api/inventario/salida', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      mostrarMensaje('Salida registrada exitosamente', 'success');
      closeModal('salidaModal');
      loadinventario();
    } else {
      mostrarMensaje(result.message || 'Error', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al registrar salida', 'error');
  }
});

async function verMovimientos(productoId) {
  try {
    const response = await fetch(`/api/inventario/movimientos/${productoId}`);
    const movimientos = await response.json();
    
    if (movimientos.length === 0) {
      alert('No hay movimientos registrados para este producto');
      return;
    }
    
    const info = movimientos.slice(0, 10).map(m => 
      `${m.Tipo}: ${m.Cantidad} unidades - ${formatearFecha(m.Fecha)}${m.Referencia ? ` (${m.Referencia})` : ''}`
    ).join('\n');
    
    alert(`📋 Últimos 10 movimientos:\n\n${info}`);
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al cargar movimientos', 'error');
  }
}

document.getElementById('searchinventario')?.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const rows = document.querySelectorAll('#tablainventario tbody tr');
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(term) ? '' : 'none';
  });
});

checkAuth();