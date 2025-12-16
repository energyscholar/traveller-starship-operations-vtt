/**
 * AR-151d: News & Mail Display Module
 * Modal for displaying system news and personal mail on arrival
 */

/**
 * Show news and mail modal when arriving at a system
 * @param {Object} state - Application state
 * @param {string} systemName - Name of the system arrived at
 */
export function showNewsMailModal(state, systemName) {
  const news = state.systemNews || [];
  const mail = state.systemMail || {};
  const roleContent = state.selectedRoleContent || {};

  // Get role-specific mail if available
  const myMail = mail[state.selectedRole] || null;
  const myRoleAdvice = roleContent[state.selectedRole] || null;

  // Create modal content
  let html = `
    <div class="news-mail-modal">
      <div class="news-mail-header">
        <h3>DATA LINK ESTABLISHED: ${systemName.toUpperCase()}</h3>
        <button onclick="closeNewsMailModal()" class="close-btn">&times;</button>
      </div>
      <div class="news-mail-content">
  `;

  // Role-specific advice section
  if (myRoleAdvice) {
    html += `
      <div class="role-advice-section">
        <h4>STATION BRIEF: ${state.selectedRole.replace('_', ' ').toUpperCase()}</h4>
        <div class="role-advice-content">${myRoleAdvice}</div>
      </div>
    `;
  }

  // Personal mail section
  if (myMail) {
    html += `
      <div class="mail-section">
        <h4>PERSONAL MESSAGE</h4>
        <div class="mail-item">
          <div class="mail-header">
            <span class="mail-from">From: ${myMail.from}</span>
            <span class="mail-subject">Re: ${myMail.subject}</span>
          </div>
          <div class="mail-body">${myMail.content}</div>
        </div>
      </div>
    `;
  }

  // News section
  if (news.length > 0) {
    html += `
      <div class="news-section">
        <h4>SYSTEM NEWS</h4>
        ${news.map(item => `
          <div class="news-item">
            <div class="news-headline">${item.headline}</div>
            <div class="news-source">— ${item.source}</div>
            <div class="news-content">${item.content}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  html += `
      </div>
      <div class="news-mail-footer">
        <button onclick="closeNewsMailModal()" class="btn btn-primary">Acknowledge</button>
      </div>
    </div>
  `;

  // Create and show modal
  let modal = document.getElementById('news-mail-overlay');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'news-mail-overlay';
    modal.className = 'news-mail-overlay';
    document.body.appendChild(modal);
  }
  modal.innerHTML = html;
  modal.style.display = 'flex';
}

/**
 * Close the news/mail modal
 */
export function closeNewsMailModal() {
  const modal = document.getElementById('news-mail-overlay');
  if (modal) {
    modal.style.display = 'none';
  }
}
