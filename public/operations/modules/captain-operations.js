/**
 * AR-153 Phase 4: Captain Operations Module
 * Captain commands, orders, and crew management
 *
 * Note: Uses global showNotification from notifications.js
 */

/**
 * Check if user has captain permission
 * @param {Object} state - Application state
 * @returns {boolean} True if user can act as captain
 */
function hasCaptainPermission(state) {
  return state.selectedRole === 'captain' || state.isGM;
}

/**
 * Mark contact (Captain only)
 * @param {Object} state - Application state
 * @param {string} marking - Contact marking (friendly, hostile, neutral, unknown)
 */
export function captainMarkContact(state, marking) {
  if (!hasCaptainPermission(state)) {
    showNotification('Only Captain can mark contacts', 'error');
    return;
  }
  const contactSelect = document.getElementById('mark-contact-select');
  if (!contactSelect) {
    showNotification('No contact selected', 'error');
    return;
  }
  const contactId = contactSelect.value;
  state.socket.emit('ops:markContact', { contactId, marking });
  showNotification(`Contact marked as ${marking}`, marking === 'hostile' ? 'warning' : 'info');
}

/**
 * Request status from crew (Captain only)
 * @param {Object} state - Application state
 */
export function captainRequestStatus(state) {
  if (!hasCaptainPermission(state)) {
    showNotification('Only Captain can request status', 'error');
    return;
  }
  state.socket.emit('ops:requestStatus', { target: 'all' });
  showNotification('Status report requested', 'info');
}

/**
 * Leadership check (Captain only)
 * @param {Object} state - Application state
 */
export function captainLeadershipCheck(state) {
  if (!hasCaptainPermission(state)) {
    showNotification('Only Captain can make leadership checks', 'error');
    return;
  }
  // TODO: Get actual skill from character
  const skill = 0;
  state.socket.emit('ops:leadershipCheck', { skill, target: 'all' });
}

/**
 * Tactics check (Captain only)
 * @param {Object} state - Application state
 */
export function captainTacticsCheck(state) {
  if (!hasCaptainPermission(state)) {
    showNotification('Only Captain can make tactics checks', 'error');
    return;
  }
  // TODO: Get actual skill from character
  const skill = 0;
  state.socket.emit('ops:tacticsCheck', { skill });
}

/**
 * Acknowledge an order (any crew)
 * @param {Object} state - Application state
 * @param {string} orderId - Order ID to acknowledge
 */
export function acknowledgeOrder(state, orderId) {
  state.socket.emit('ops:acknowledgeOrder', { orderId });
  showNotification('Order acknowledged', 'success');
}

/**
 * Captain Solo Mode - execute commands directly
 * Routes to existing role handlers with captain override
 * @param {Object} state - Application state
 * @param {Function} showPlacesOverlayFn - Function to show places overlay
 * @param {string} command - Command to execute
 */
export function captainSoloCommand(state, showPlacesOverlayFn, command) {
  switch (command) {
    case 'plotJump':
      // AR-173: Switch to astrogator panel and execute plot
      if (typeof window.switchCaptainPanel === 'function') {
        window.switchCaptainPanel('astrogator');
        // Focus destination input after panel switch
        setTimeout(() => {
          const destInput = document.getElementById('jump-destination');
          if (destInput) destInput.focus();
        }, 500);
      }
      if (typeof window.plotJumpCourse === 'function') {
        window.plotJumpCourse();
      }
      break;

    case 'verifyPosition':
      state.socket.emit('ops:verifyPosition');
      showNotification('Verifying position...', 'info');
      break;

    case 'setCourse':
      // AR-173: Switch to pilot panel and show places
      if (typeof window.switchCaptainPanel === 'function') {
        window.switchCaptainPanel('pilot');
      }
      showPlacesOverlayFn();
      break;

    case 'refuel':
      // AR-173: Switch to engineer panel and open refuel modal
      if (typeof window.switchCaptainPanel === 'function') {
        window.switchCaptainPanel('engineer');
      }
      if (typeof window.openRefuelModal === 'function') {
        window.openRefuelModal();
      } else {
        state.socket.emit('ops:getAvailableFuelSources');
        showNotification('Checking available fuel sources...', 'info');
      }
      break;

    case 'refineFuel':
      // AR-173: Switch to engineer panel for processing
      if (typeof window.switchCaptainPanel === 'function') {
        window.switchCaptainPanel('engineer');
      }
      state.socket.emit('ops:startFuelProcessing', { tons: 'all' });
      showNotification('Starting fuel processing...', 'info');
      break;

    case 'travel':
      // AR-173: Execute travel from captain position
      if (typeof window.travel === 'function') {
        window.travel();
      } else {
        state.socket.emit('ops:travel');
      }
      break;

    case 'initiateJump':
      // AR-173: Execute jump from captain position
      if (typeof window.initiateJump === 'function') {
        window.initiateJump();
      } else {
        state.socket.emit('ops:initiateJump');
      }
      break;

    default:
      showNotification(`Unknown command: ${command}`, 'warning');
  }

  // Log the captain's action
  state.socket.emit('ops:addLogEntry', {
    entryType: 'command',
    message: `Captain orders: ${command}`,
    actor: 'Captain'
  });
}

/**
 * AR-35: Navigation Quick Order
 * Issues a navigation order to the pilot with tracking
 * @param {Object} state - Application state
 * @param {string} navType - Order type: emergency_break, pursue, run_silent, full_speed
 */
export function captainNavOrder(state, navType) {
  if (!hasCaptainPermission(state)) {
    showNotification('Only Captain can issue navigation orders', 'error');
    return;
  }

  // Build order data
  const orderData = { navType };

  // For pursue orders, get the selected contact
  if (navType === 'pursue') {
    const contactSelect = document.getElementById('pursue-contact-select');
    if (!contactSelect || !contactSelect.value) {
      showNotification('No contact selected for pursuit', 'warning');
      return;
    }
    orderData.contactId = contactSelect.value;
  }

  // Emit the nav order
  state.socket.emit('ops:navOrder', orderData);

  // Display status
  const statusEl = document.getElementById('nav-order-status');
  const messages = {
    emergency_break: 'Emergency braking ordered!',
    pursue: 'Pursuit order issued!',
    run_silent: 'Running silent ordered!',
    full_speed: 'Full speed ordered!'
  };

  if (statusEl) {
    statusEl.textContent = messages[navType] || 'Order issued';
    statusEl.style.color = navType === 'emergency_break' ? 'var(--danger)' : 'var(--text-muted)';
    // Clear after 5 seconds
    setTimeout(() => { statusEl.textContent = ''; }, 5000);
  }

  showNotification(messages[navType] || 'Navigation order issued', navType === 'emergency_break' ? 'warning' : 'info');

  // Log the order
  state.socket.emit('ops:addLogEntry', {
    entryType: 'order',
    message: `Navigation order: ${navType}${orderData.contactId ? ` (contact: ${orderData.contactId})` : ''}`,
    actor: 'Captain'
  });
}

/**
 * AR-35: Issue standard order from template dropdown
 * @param {Object} state - Application state
 */
export function captainIssueOrder(state) {
  if (!hasCaptainPermission(state)) {
    showNotification('Only Captain can issue orders', 'error');
    return;
  }

  const select = document.getElementById('order-template-select');
  if (!select) {
    showNotification('Order template not found', 'error');
    return;
  }

  const selectedOption = select.options[select.selectedIndex];
  const orderData = {
    templateId: select.value,
    text: selectedOption.textContent,
    targetRole: selectedOption.dataset.target || 'all',
    priority: selectedOption.dataset.priority || 'normal',
    requiresAck: true
  };

  // Emit the order
  state.socket.emit('ops:issueOrder', orderData);

  // Display status
  const statusEl = document.getElementById('order-status');
  if (statusEl) {
    statusEl.textContent = `Order issued: ${orderData.text}`;
    setTimeout(() => { statusEl.textContent = ''; }, 5000);
  }

  showNotification(`Order issued to ${orderData.targetRole === 'all' ? 'all crew' : orderData.targetRole}`, 'info');

  // Log the order
  state.socket.emit('ops:addLogEntry', {
    entryType: 'order',
    message: `Captain orders: ${orderData.text}`,
    actor: 'Captain'
  });
}

/**
 * AR-35: Issue custom order with free text
 * @param {Object} state - Application state
 */
export function captainIssueCustomOrder(state) {
  if (!hasCaptainPermission(state)) {
    showNotification('Only Captain can issue orders', 'error');
    return;
  }

  const textInput = document.getElementById('custom-order-text');
  const targetSelect = document.getElementById('custom-order-target');

  if (!textInput || !textInput.value.trim()) {
    showNotification('Enter an order first', 'warning');
    return;
  }

  const orderData = {
    text: textInput.value.trim(),
    targetRole: targetSelect?.value || 'all',
    priority: 'normal',
    requiresAck: true
  };

  // Emit the order
  state.socket.emit('ops:issueOrder', orderData);

  // Clear input and display status
  textInput.value = '';
  const statusEl = document.getElementById('order-status');
  if (statusEl) {
    statusEl.textContent = `Order issued: ${orderData.text}`;
    setTimeout(() => { statusEl.textContent = ''; }, 5000);
  }

  showNotification(`Custom order issued to ${orderData.targetRole === 'all' ? 'all crew' : orderData.targetRole}`, 'info');

  // Log the order
  state.socket.emit('ops:addLogEntry', {
    entryType: 'order',
    message: `Captain orders: ${orderData.text}`,
    actor: 'Captain'
  });
}
