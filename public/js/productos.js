// Verificar autenticación
async function checkAuth() {
  try {
    const response = await fetch('/api/auth/session');
    const data = await response.json();
    
    if (data.authenticated) {
      document.getElementById('userName').textContent = data.user.nombre;
      document.getElementById('authBtn').textContent = 'Cerrar Sesión';
      document.getElementById('authBtn').onclick = logout;
      document.getElementById('dashboardLink').style.display = 'block';
    }
  } catch (error) {
    console.error('Error verificando sesión:', error);
  }
}

function handleAuth() {
  window.location.href = 'login.html';
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
}

// Cargar productos
async function loadproductos() {
  const container = document.getElementById('productosGrid');
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando productos...</p></div>';
  
  try {
    const response = await fetch('/api/productos');
    if (!response.ok) throw new Error('Error al cargar productos');
    
    const productos = await response.json();
    renderproductos(productos);
  } catch (error) {
    console.error('Error:', error);
    container.innerHTML = '<div class="error-message"><p>❌ Error al cargar productos</p></div>';
  }
}

// Filtrar productos de temporada
async function filterTemporada() {
  const container = document.getElementById('productosGrid');
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando productos...</p></div>';
  
  try {
    const response = await fetch('/api/productos/temporada');
    if (!response.ok) throw new Error('Error al cargar productos');
    
    const productos = await response.json();
    renderproductos(productos);
  } catch (error) {
    console.error('Error:', error);
    container.innerHTML = '<div class="error-message"><p>❌ Error al cargar productos</p></div>';
  }
}

// Renderizar productos
function renderproductos(productos) {
  const container = document.getElementById('productosGrid');
  
  if (productos.length === 0) {
    container.innerHTML = '<div class="no-products"><p>🎃 No se encontraron productos</p></div>';
    return;
  }
  
  container.innerHTML = productos.map(p => `
    <div class="product-card">
      <div class="product-image">
        ${p.URL_foto 
          ? `<img src="${p.URL_foto}" alt="${p.Nombre}">`
          : `<div class="product-placeholder">🍞</div>`
        }
      </div>
      <div class="product-info">
        <h3>${p.Nombre}</h3>
        <p class="product-description">${p.Descripción || 'Delicioso producto artesanal'}</p>
        <p style="color: var(--color-secondary); opacity: 0.9; margin: 10px 0;">
          📦 categoria: ${p.Categoria || 'General'}
        </p>
        <p style="color: var(--color-secondary); opacity: 0.9; margin: 10px 0;">
          📏 ${p.Unidad_de_Medida || 'Pieza'}
        </p>
        <div class="product-footer">
          <span class="product-price">${formatearPrecio(p.precio_venta)}</span>
          <span class="product-stock">
            ${p.Stock > 0 
              ? `📦 ${p.Stock} disponibles` 
              : '❌ Agotado'
            }
          </span>
        </div>
      </div>
    </div>
  `).join('');
}

// Buscar productos
document.getElementById('searchInput')?.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const cards = document.querySelectorAll('.product-card');
  
  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(searchTerm) ? 'block' : 'none';
  });
});

// Inicializar
checkAuth();
loadproductos();