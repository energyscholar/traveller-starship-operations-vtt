/**
 * Auth Check Module
 *
 * Checks authentication status and handles redirects.
 * Must be loaded early in the page lifecycle.
 */

const AuthCheck = {
  user: null,
  authEnabled: false,
  authRequired: false,

  /**
   * Check auth status and redirect if needed
   * @returns {Promise<{user: Object|null, enabled: boolean}>}
   */
  async check() {
    try {
      const response = await fetch('/auth/status');
      const data = await response.json();

      this.authEnabled = data.enabled;
      this.user = data.user;

      // Check if we need to redirect to login
      // Auth is required if enabled and we get a 401 on protected routes
      // For now, we allow anonymous access but track auth state

      console.log('[AUTH] Status:', data.enabled ? 'enabled' : 'disabled',
        data.user ? `user: ${data.user.username}` : 'anonymous');

      return data;
    } catch (err) {
      console.warn('[AUTH] Failed to check status:', err.message);
      return { enabled: false, user: null };
    }
  },

  /**
   * Check if current user is authenticated
   */
  isAuthenticated() {
    return this.user !== null;
  },

  /**
   * Get current user
   */
  getUser() {
    return this.user;
  },

  /**
   * Logout and redirect to login page
   */
  async logout() {
    try {
      await fetch('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('[AUTH] Logout error:', err.message);
    }
    window.location.href = '/login.html';
  },

  /**
   * Add auth UI elements to the page
   */
  addAuthUI() {
    if (!this.authEnabled) return;

    // Add to login screen if user is logged in
    const loginContainer = document.querySelector('.login-container');
    if (loginContainer && this.user) {
      const userInfo = document.createElement('div');
      userInfo.className = 'auth-user-info';
      userInfo.innerHTML = `
        <p style="color: var(--accent-green); margin-bottom: 15px;">
          Logged in as <strong>${this.user.username}</strong>
          <button class="btn btn-link btn-small" onclick="AuthCheck.logout()" style="margin-left: 10px;">Logout</button>
        </p>
      `;
      loginContainer.insertBefore(userInfo, loginContainer.querySelector('.login-options'));
    }

    // Add logout to hamburger menu area if it exists
    const menuBtn = document.getElementById('btn-menu');
    if (menuBtn && this.user) {
      // The menu will show auth options
      console.log('[AUTH] User authenticated, menu will show account options');
    }
  }
};

// Auto-check on load if this script is included
if (typeof window !== 'undefined') {
  window.AuthCheck = AuthCheck;
}
