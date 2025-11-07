// Verificar autenticación
async function checkAuth() {
  try {
    const response = await fetch('/api/auth/session');
    const data = await response.json();
    
    if (!data.authenticated) {
      window.location.href = 'login.html';
      return;
    }
    
    document.getElementById('userName').textContent = data.user.nombre;
    loadClientes();
  } catch (error) {
    console.error('Error:', error);
    window.location.href = 'login.html';
  }
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Error:', error);
  }
}

// Cargar clientes
async function loadClientes() {
  const tbody = document.querySelector('#tablaClientes tbody');
  tbody.innerHTML = '<tr><td colspan="7" class="loading">Cargando...</td></tr>';
  
  try {
    const response = await fetch('/api/clientes');
    if (!response.ok) throw new Error('Error al cargar');
    
    const clientes = await response.json();
    
    if (clientes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay clientes registrados</td></tr>';
      return;
    }
    
    tbody.innerHTML = clientes.map(c => `
      <tr>
        <td>#${c.ID_Cliente}</td>
        <td>${c.Nombre} ${c.Apellido || ''}</td>
        <td>${c.Correo}</td>
        <td>${c.Teléfono || 'N/A'}</td>
        <td>${c.Total_Pedidos}</td>
        <td>${formatearPrecio(c.Total_Compras)}</td>
        <td>
          <button onclick="viewCliente(${c.ID_Cliente})" class="btn-small" style="margin-right: 5px;">Ver</button>
          <button onclick="editCliente(${c.ID_Cliente})" class="btn-small" style="background: #2196f3; margin-right: 5px;">Editar</button>
          <button onclick="deleteCliente(${c.ID_Cliente})" class="btn-small" style="background: #f44336;">Eliminar</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al cargar clientes', 'error');
  }
}

// Mostrar modal para nuevo cliente
function showAddModal() {
  document.getElementById('modalTitle').textContent = 'Nuevo Cliente';
  document.getElementById('clienteForm').reset();
  document.getElementById('clienteId').value = '';
  document.getElementById('clienteModal').style.display = 'block';
}

// Cerrar modal
function closeModal() {
  document.getElementById('clienteModal').style.display = 'none';
}

// Ver detalles del cliente
async function viewCliente(id) {
  try {
    const response = await fetch(`/api/clientes/${id}`);
    if (!response.ok) throw new Error('Error al cargar');
    
    const cliente = await response.json();
    
    const info = `
      🎃 Cliente #${cliente.ID_Cliente}
      
      👤 Nombre: ${cliente.Nombre} ${cliente.Apellido || ''}
      📧 Correo: ${cliente.Correo}
      📱 Teléfono: ${cliente.Teléfono || 'N/A'}
      
      📊 Estadísticas:
      - Total de pedidos: ${cliente.Total_Pedidos}
      - Total gastado: ${formatearPrecio(cliente.Total_Compras)}
      
      🏠 Direcciones: ${cliente.direcciones.length}
    `;
    
    alert(info);
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al cargar detalles', 'error');
  }
}

// Editar cliente
async function editCliente(id) {
  try {
    const response = await fetch(`/api/clientes/${id}`);
    if (!response.ok) throw new Error('Error al cargar');
    
    const cliente = await response.json();
    
    document.getElementById('modalTitle').textContent = 'Editar Cliente';
    document.getElementById('clienteId').value = cliente.ID_Cliente;
    document.getElementById('nombre').value = cliente.Nombre;
    document.getElementById('apellido').value = cliente.Apellido || '';
    document.getElementById('correo').value = cliente.Correo;
    document.getElementById('telefono').value = cliente.Teléfono || '';
    document.getElementById('clienteModal').style.display = 'block';
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al cargar datos', 'error');
  }
}

// Eliminar cliente
async function deleteCliente(id) {
  if (!confirmarAccion('¿Estás seguro de eliminar este cliente?')) return;
  
  try {
    const response = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
    const data = await response.json();
    
    if (response.ok) {
      mostrarMensaje('Cliente eliminado exitosamente', 'success');
      loadClientes();
    } else {
      mostrarMensaje(data.message || 'Error al eliminar', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al eliminar cliente', 'error');
  }
}

// Guardar cliente (crear o actualizar)
document.getElementById('clienteForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const id = document.getElementById('clienteId').value;
  const data = {
    nombre: document.getElementById('nombre').value.trim(),
    apellido: document.getElementById('apellido').value.trim(),
    correo: document.getElementById('correo').value.trim(),
    telefono: document.getElementById('telefono').value.trim()
  };
  
  // Validaciones
  if (!validarTexto(data.nombre, 2)) {
    mostrarMensaje('El nombre debe tener al menos 2 caracteres', 'error');
    return;
  }
  
  if (!validarEmail(data.correo)) {
    mostrarMensaje('Correo electrónico inválido', 'error');
    return;
  }
  
  try {
    const url = id ? `/api/clientes/${id}` : '/api/clientes';
    const method = id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      mostrarMensaje(id ? 'Cliente actualizado' : 'Cliente creado', 'success');
      closeModal();
      loadClientes();
    } else {
      mostrarMensaje(result.message || 'Error al guardar', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al guardar cliente', 'error');
  }
});

// Buscar clientes
document.getElementById('searchClientes')?.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const rows = document.querySelectorAll('#tablaClientes tbody tr');
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(searchTerm) ? '' : 'none';
  });
});

// Inicializar
checkAuth();