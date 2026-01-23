/**
 * Registration Page Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  const errorDiv = document.getElementById('error-message');
  const successDiv = document.getElementById('success-message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Client-side validation
    if (!username || username.length < 3) {
      showError('Username must be at least 3 characters');
      return;
    }

    if (!password || password.length < 8) {
      showError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    try {
      const response = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email: email || undefined })
      });

      const data = await response.json();

      if (!response.ok) {
        showError(data.error || 'Registration failed');
        return;
      }

      // Success - show message and redirect
      showSuccess('Account created! Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 1500);
    } catch (err) {
      showError('Network error. Please try again.');
      console.error('Registration error:', err);
    }
  });

  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.add('visible');
    successDiv.classList.remove('visible');
  }

  function showSuccess(message) {
    successDiv.textContent = message;
    successDiv.classList.add('visible');
    errorDiv.classList.remove('visible');
  }

  function hideMessages() {
    errorDiv.classList.remove('visible');
    successDiv.classList.remove('visible');
  }
});
