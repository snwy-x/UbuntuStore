// login y registro
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const errorDiv = document.getElementById('loginError');

const authTabs = document.getElementById('authTabs');
const formSlideContainer = document.getElementById('formSlideContainer');
const loginPane = document.getElementById('loginPane');
const registerPane = document.getElementById('registerPane');

// cambiar pestañas
tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  if (authTabs) authTabs.classList.remove('register-active');
  if (formSlideContainer) formSlideContainer.classList.remove('register-active');
  if (loginPane) loginPane.classList.remove('inactive');
  if (registerPane) registerPane.classList.add('inactive');
  errorDiv.classList.remove('show');
  document.getElementById('username').focus();
});

tabRegister.addEventListener('click', () => {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  if (authTabs) authTabs.classList.add('register-active');
  if (formSlideContainer) formSlideContainer.classList.add('register-active');
  if (loginPane) loginPane.classList.add('inactive');
  if (registerPane) registerPane.classList.remove('inactive');
  errorDiv.classList.remove('show');
  document.getElementById('regFullName').focus();
});



// iniciar sesion
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btn = document.getElementById('loginBtn');
  const usuario = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  
  if (!usuario || !password) {
    errorDiv.textContent = 'Por favor complete todos los campos';
    errorDiv.classList.add('show');
    return;
  }
  
  btn.classList.add('loading');
  btn.disabled = true;
  errorDiv.classList.remove('show');
  
  try {
    const result = await window.api.login({ usuario, password });
    
    if (result.success) {
      // guardar sesion
      sessionStorage.setItem('user', JSON.stringify(result.user));
      
      // redireccionar por rol
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || 'index.html';
      
      if (result.user.rol === 'Cliente') {
        window.location.href = redirect;
      } else {
        window.location.href = 'dashboard.html';
      }
    } else {
      errorDiv.textContent = result.message;
      errorDiv.classList.add('show');
    }
  } catch (err) {
    errorDiv.textContent = 'Error de conexión. Verifique que el servidor esté activo.';
    errorDiv.classList.add('show');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});

// registrar usuario
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btn = document.getElementById('registerBtn');
  const nombre_completo = document.getElementById('regFullName').value.trim();
  const usuario = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  const passwordConfirm = document.getElementById('regPasswordConfirm').value;
  
  if (password.length < 6) {
    errorDiv.textContent = 'La contraseña debe tener al menos 6 caracteres';
    errorDiv.classList.add('show');
    return;
  }
  
  if (password !== passwordConfirm) {
    errorDiv.textContent = 'Las contraseñas no coinciden';
    errorDiv.classList.add('show');
    return;
  }
  
  btn.classList.add('loading');
  btn.disabled = true;
  errorDiv.classList.remove('show');
  
  try {
    const result = await window.api.register({ nombre_completo, usuario, password });
    
    if (result.success) {
      registerForm.reset();
      errorDiv.textContent = '¡Registro exitoso! Ya puede iniciar sesión.';
      errorDiv.className = 'login-error show';
      errorDiv.style.background = 'rgba(77, 144, 142, 0.15)';
      errorDiv.style.borderColor = 'rgba(77, 144, 142, 0.3)';
      errorDiv.style.color = 'var(--success)';
      
      setTimeout(() => {
        tabLogin.click();
        document.getElementById('username').value = usuario;
        document.getElementById('password').focus();
        // resetear estilos de error
        setTimeout(() => {
          errorDiv.className = 'login-error';
          errorDiv.style.background = '';
          errorDiv.style.borderColor = '';
          errorDiv.style.color = '';
        }, 1000);
      }, 1500);
    } else {
      errorDiv.textContent = result.message;
      errorDiv.classList.add('show');
    }
  } catch (err) {
    errorDiv.textContent = 'Error al registrar usuario. Intente más tarde.';
    errorDiv.classList.add('show');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});

// foco inicial
document.getElementById('username').focus();

// enviar con enter
document.getElementById('password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    loginForm.dispatchEvent(new Event('submit'));
  }
});

document.getElementById('regPasswordConfirm').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    registerForm.dispatchEvent(new Event('submit'));
  }
});
