/**
 * AR-151-2d: Mail Compose Module
 * Stage 11.1: Compose and send mail messages
 */

/**
 * Show compose mail modal
 * @param {Object} state - Application state
 * @param {Function} showModalContent - Function to show modal content
 * @param {Function} showError - Function to show error message
 * @param {Function} showMessage - Function to show success message
 */
export function showComposeMailModal(state, showModalContent, showError, showMessage) {
  // Request known contacts for recipient picker
  state.socket.emit('ops:getNPCContacts');

  // Show modal with loading state, will be populated when contacts arrive
  const html = `
    <div class="modal-header">
      <h2>Compose Message</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body">
      <div class="mail-compose-form">
        <div class="form-group">
          <label for="compose-recipient">To:</label>
          <select id="compose-recipient" class="compose-select">
            <option value="">Loading contacts...</option>
          </select>
        </div>
        <div class="form-group">
          <label for="compose-subject">Subject:</label>
          <input type="text" id="compose-subject" class="compose-input" placeholder="Message subject">
        </div>
        <div class="form-group">
          <label for="compose-body">Message:</label>
          <textarea id="compose-body" class="compose-textarea" rows="6" placeholder="Type your message..."></textarea>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-primary" id="btn-send-compose">Send</button>
    </div>
  `;
  showModalContent(html);

  // Store a flag to populate contacts when they arrive
  state.pendingComposeContacts = true;

  // Send button handler
  document.getElementById('btn-send-compose').addEventListener('click', () => {
    const recipientId = document.getElementById('compose-recipient').value;
    const recipientName = document.getElementById('compose-recipient').selectedOptions[0]?.text || 'Unknown';
    const subject = document.getElementById('compose-subject').value.trim();
    const body = document.getElementById('compose-body').value.trim();

    if (!recipientId) {
      showError('Please select a recipient');
      return;
    }
    if (!subject) {
      showError('Please enter a subject');
      return;
    }
    if (!body) {
      showError('Please enter a message');
      return;
    }

    state.socket.emit('ops:playerSendMail', {
      recipientId,
      recipientName,
      subject,
      body
    });
    showMessage('Message sent');
    // Clear form instead of closing modal so user can send multiple messages
    document.getElementById('compose-subject').value = '';
    document.getElementById('compose-body').value = '';
    // Keep recipient selected for convenience
  });
}

/**
 * Populate compose contacts when received
 * @param {Object} state - Application state
 * @param {Array} contacts - List of NPC contacts
 */
export function populateComposeContacts(state, contacts) {
  if (!state.pendingComposeContacts) return;
  state.pendingComposeContacts = false;

  const select = document.getElementById('compose-recipient');
  if (!select) return;

  select.innerHTML = '<option value="">-- Select recipient --</option>';
  for (const contact of contacts) {
    const option = document.createElement('option');
    option.value = contact.id;
    option.textContent = contact.name + (contact.title ? ` (${contact.title})` : '');
    select.appendChild(option);
  }
}
