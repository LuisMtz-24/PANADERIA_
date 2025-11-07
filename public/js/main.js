// Cargar productos destacados al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  cargarproductosDestacados();
});

async function cargarproductosDestacados() {
  const container = document.getElementById('productosDestacados');
  
  try {
    const response = await fetch('/api/productos/temporada');
    
    if (!response.ok) {
      throw new Error('Error al cargar productos');
    }
    
    const productos = await response.json();
    
    if (productos.length === 0) {
      container.innerHTML = `
        <div class="no-products">
          <p>🎃 Próximamente tendremos productos de temporada 🎃</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = productos.slice(0, 6).map(producto => `
      <div class="product-card">
        <div class="product-image">
          ${producto.URL_foto 
            ? `<img src="${producto.URL_foto}" alt="${producto.Nombre}">`
            : `<div class="product-placeholder">🎃</div>`
          }
        </div>
        <div class="product-info">
          <h3>${producto.Nombre}</h3>
          <p class="product-description">${producto.Descripción || 'Delicioso producto de temporada'}</p>
          <div class="product-footer">
            <span class="product-price">${formatearPrecio(producto.precio_venta)}</span>
            <span class="product-stock">
              ${producto.Stock > 0 
                ? `📦 ${producto.Stock} disponibles` 
                : '❌ Agotado'
              }
            </span>
          </div>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error:', error);
    container.innerHTML = `
      <div class="error-message">
        <p>❌ Error al cargar productos. Por favor intenta más tarde.</p>
      </div>
    `;
  }
}

// Función auxiliar para formatear precio (si no está en validaciones.js)
if (typeof formatearPrecio === 'undefined') {
  function formatearPrecio(precio) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(precio);
  }
}