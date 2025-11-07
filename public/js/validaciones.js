// Validaciones del Frontend

// Validar email
function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Validar contraseña (mínimo 6 caracteres)
function validarPassword(password) {
  return password.length >= 6;
}

// Validar texto no vacío
function validarTexto(texto, minLength = 1) {
  return texto && texto.trim().length >= minLength;
}

// Validar número positivo
function validarNumeroPositivo(numero) {
  return !isNaN(numero) && parseFloat(numero) > 0;
}

// Validar precio
function validarPrecio(precio) {
  return !isNaN(precio) && parseFloat(precio) >= 0;
}

// Mostrar mensaje de error
function mostrarError(elementId, mensaje) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = mensaje;
    element.style.display = 'block';
  }
}

// Limpiar mensaje de error
function limpiarError(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = '';
    element.style.display = 'none';
  }
}

// Limpiar todos los errores de un formulario
function limpiarErroresForm(formId) {
  const form = document.getElementById(formId);
  if (form) {
    const errorElements = form.querySelectorAll('.error-message');
    errorElements.forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });
  }
}

// Mostrar mensaje general (éxito o error)
function mostrarMensaje(mensaje, tipo = 'success') {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${tipo}`;
  messageDiv.textContent = mensaje;
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${tipo === 'success' ? '#4caf50' : '#f44336'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(messageDiv);
  
  setTimeout(() => {
    messageDiv.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => messageDiv.remove(), 300);
  }, 3000);
}

// Confirmar acción
function confirmarAccion(mensaje) {
  return confirm(mensaje);
}

// Formatear fecha para mostrar
function formatearFecha(fecha) {
  const date = new Date(fecha);
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Formatear precio
function formatearPrecio(precio) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(precio);
}

// Agregar estilos de animación
if (!document.getElementById('validacion-styles')) {
  const styles = document.createElement('style');
  styles.id = 'validacion-styles';
  styles.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
    
    .error-message {
      color: #f44336;
      font-size: 0.85rem;
      margin-top: 5px;
      display: none;
    }
    
    .message {
      animation: slideIn 0.3s ease;
    }
  `;
  document.head.appendChild(styles);
}