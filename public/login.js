/**
 * Login Page Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const errorDiv = document.getElementById('error-message');
  const googleBtn = document.getElementById('google-login');

  // Check if already logged in
  checkAuthStatus();

  // Check if Google OAuth is available
  checkGoogleAvailable();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showError('Please enter username and password');
      return;
    }

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        showError(data.error || 'Login failed');
        return;
      }

      // Success - redirect to operations
      window.location.href = '/operations';
    } catch (err) {
      showError('Network error. Please try again.');
      console.error('Login error:', err);
    }
  });

  async function checkAuthStatus() {
    try {
      const response = await fetch('/auth/status');
      const data = await response.json();

      if (data.user) {
        // Already logged in, redirect
        window.location.href = '/operations';
      }
    } catch (err) {
      // Ignore errors - just stay on login page
    }
  }

  async function checkGoogleAvailable() {
    try {
      const response = await fetch('/auth/providers');
      const data = await response.json();

      const hasGoogle = data.providers?.some(p => p.id === 'google');
      if (!hasGoogle) {
        googleBtn.style.display = 'none';
        // Also hide the divider if no OAuth providers
        const divider = document.querySelector('.divider');
        if (divider) divider.style.display = 'none';
      }
    } catch (err) {
      // Hide Google button on error
      googleBtn.style.display = 'none';
    }
  }

  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.add('visible');
  }

  function hideError() {
    errorDiv.classList.remove('visible');
  }
});
