// Alternar entre formularios de login y registro
const loginBox = document.querySelector('.login-box:not(#registerBox)');
const registerBox = document.getElementById('registerBox');
const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');

showRegisterLink.addEventListener('click', (e) => {
  e.preventDefault();
  loginBox.style.display = 'none';
  registerBox.style.display = 'block';
});

showLoginLink.addEventListener('click', (e) => {
  e.preventDefault();
  registerBox.style.display = 'none';
  loginBox.style.display = 'block';
});

// Manejar Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErroresForm('loginForm');
  
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  // Validaciones
  let hasErrors = false;
  
  if (!validarEmail(email)) {
    mostrarError('emailError', 'Por favor ingresa un correo válido');
    hasErrors = true;
  }
  
  if (!validarPassword(password)) {
    mostrarError('passwordError', 'La contraseña debe tener al menos 6 caracteres');
    hasErrors = true;
  }
  
  if (hasErrors) return;
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      mostrarMensajeLogin('Inicio de sesión exitoso', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    } else {
      mostrarMensajeLogin(data.message || 'Error al iniciar sesión', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarMensajeLogin('Error de conexión. Intenta nuevamente.', 'error');
  }
});

// Manejar Registro
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErroresForm('registerForm');
  
  const nombre = document.getElementById('registerNombre').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  // Validaciones
  let hasErrors = false;
  
  if (!validarTexto(nombre, 3)) {
    mostrarError('nombreError', 'El nombre debe tener al menos 3 caracteres');
    hasErrors = true;
  }
  
  if (!validarEmail(email)) {
    mostrarError('regEmailError', 'Por favor ingresa un correo válido');
    hasErrors = true;
  }
  
  if (!validarPassword(password)) {
    mostrarError('regPasswordError', 'La contraseña debe tener al menos 6 caracteres');
    hasErrors = true;
  }
  
  if (password !== confirmPassword) {
    mostrarError('confirmPasswordError', 'Las contraseñas no coinciden');
    hasErrors = true;
  }
  
  if (hasErrors) return;
  
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: nombre,
        password,
        email,
        nombre
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      mostrarMensajeRegister('¡Registro exitoso! Ahora puedes iniciar sesión', 'success');
      setTimeout(() => {
        registerBox.style.display = 'none';
        loginBox.style.display = 'block';
        document.getElementById('registerForm').reset();
      }, 2000);
    } else {
      mostrarMensajeRegister(data.message || 'Error al registrar usuario', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarMensajeRegister('Error de conexión. Intenta nuevamente.', 'error');
  }
});

// Funciones para mostrar mensajes en los formularios
function mostrarMensajeLogin(mensaje, tipo) {
  const messageDiv = document.getElementById('loginMessage');
  messageDiv.textContent = mensaje;
  messageDiv.className = `message ${tipo === 'success' ? 'message-success' : 'message-error'}`;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}

function mostrarMensajeRegister(mensaje, tipo) {
  const messageDiv = document.getElementById('registerMessage');
  messageDiv.textContent = mensaje;
  messageDiv.className = `message ${tipo === 'success' ? 'message-success' : 'message-error'}`;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}