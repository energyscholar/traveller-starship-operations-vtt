/**
 * AR-153 Phase 5: Contact Tooltip Module
 * Contact popup display and interaction functions
 *
 * Note: Uses globals escapeHtml, formatRange, formatRangeBand, createUWPSpan,
 *       formatShipWeapons, getShipAsciiArt, showNotification, debugWarn
 */

/**
 * Factory function for star-specific popup content
 * @param {Object} contact - Contact object
 * @returns {string} HTML content for star info
 */
export function getStarPopupContent(contact) {
  let content = '';

  // Stellar class (always show for stars)
  if (contact.stellar_class) {
    content += `
      <div class="tooltip-row star-info">
        <span class="label">Spectral Type:</span>
        <span class="value">${escapeHtml(contact.stellar_class)}</span>
      </div>
    `;
  }

  // Parse stellar_info if it's JSON, or use individual fields
  let starInfo = {};
  if (contact.stellar_info) {
    try {
      starInfo = typeof contact.stellar_info === 'string'
        ? JSON.parse(contact.stellar_info)
        : contact.stellar_info;
    } catch (e) {
      if (typeof debugWarn === 'function') debugWarn('Failed to parse stellar_info:', e);
    }
  }

  // Temperature
  if (starInfo.temperature || contact.temperature) {
    content += `
      <div class="tooltip-row star-info">
        <span class="label">Temperature:</span>
        <span class="value">${escapeHtml(starInfo.temperature || contact.temperature)}</span>
      </div>
    `;
  }

  // Luminosity
  if (starInfo.luminosity || contact.luminosity) {
    content += `
      <div class="tooltip-row star-info">
        <span class="label">Luminosity:</span>
        <span class="value">${escapeHtml(starInfo.luminosity || contact.luminosity)}</span>
      </div>
    `;
  }

  // Mass
  if (starInfo.mass || contact.mass) {
    content += `
      <div class="tooltip-row star-info">
        <span class="label">Mass:</span>
        <span class="value">${escapeHtml(starInfo.mass || contact.mass)}</span>
      </div>
    `;
  }

  // Habitable zone
  if (starInfo.habitableZone || contact.habitable_zone) {
    content += `
      <div class="tooltip-row star-info">
        <span class="label">Habitable Zone:</span>
        <span class="value">${escapeHtml(starInfo.habitableZone || contact.habitable_zone)}</span>
      </div>
    `;
  }

  // Description
  if (starInfo.description || contact.star_description) {
    content += `
      <div class="tooltip-description star-description">
        ${escapeHtml(starInfo.description || contact.star_description)}
      </div>
    `;
  }

  return content;
}

/**
 * Factory function for ship-specific popup content
 * @param {Object} contact - Contact object
 * @returns {string} HTML content for ship info
 */
export function getShipPopupContent(contact) {
  let content = '';

  // AR-200: Ship class/type display
  if (contact.ship_type || contact.ship_class) {
    content += `
      <div class="tooltip-row ship-info">
        <span class="label">Class:</span>
        <span class="value">${escapeHtml(contact.ship_type || contact.ship_class)}</span>
      </div>
    `;
  }

  if (contact.tonnage) {
    content += `
      <div class="tooltip-row ship-info">
        <span class="label">Tonnage:</span>
        <span class="value">${contact.tonnage} dT</span>
      </div>
    `;
  }

  // AR-200: Jump and thrust ratings
  if (contact.jump_rating !== undefined) {
    content += `
      <div class="tooltip-row ship-info">
        <span class="label">Jump:</span>
        <span class="value">J-${contact.jump_rating}</span>
      </div>
    `;
  }

  if (contact.thrust !== undefined) {
    content += `
      <div class="tooltip-row ship-info">
        <span class="label">Thrust:</span>
        <span class="value">${contact.thrust}G</span>
      </div>
    `;
  }

  // AR-200: Armor if present
  if (contact.armour !== undefined && contact.armour > 0) {
    content += `
      <div class="tooltip-row ship-info">
        <span class="label">Armour:</span>
        <span class="value">${contact.armour}</span>
      </div>
    `;
  }

  if (contact.crew_count) {
    content += `
      <div class="tooltip-row ship-info">
        <span class="label">Crew:</span>
        <span class="value">${contact.crew_count}</span>
      </div>
    `;
  }

  // AR-200: Allegiance/flag if present
  if (contact.allegiance || contact.flag) {
    content += `
      <div class="tooltip-row ship-info">
        <span class="label">Flag:</span>
        <span class="value">${escapeHtml(contact.allegiance || contact.flag)}</span>
      </div>
    `;
  }

  return content;
}

/**
 * Factory function for station-specific popup content
 * @param {Object} contact - Contact object
 * @returns {string} HTML content for station info
 */
export function getStationPopupContent(contact) {
  let content = '';

  if (contact.population) {
    content += `
      <div class="tooltip-row station-info">
        <span class="label">Population:</span>
        <span class="value">${contact.population}</span>
      </div>
    `;
  }

  if (contact.services) {
    const services = typeof contact.services === 'string'
      ? JSON.parse(contact.services)
      : contact.services;
    if (services && services.length) {
      content += `
        <div class="tooltip-row station-info">
          <span class="label">Services:</span>
          <span class="value">${escapeHtml(services.join(', '))}</span>
        </div>
      `;
    }
  }

  return content;
}

/**
 * Show contact tooltip popup
 * @param {Object} state - Application state
 * @param {string} contactId - Contact ID
 * @param {HTMLElement} targetElement - Element to position tooltip near
 */
export function showContactTooltip(state, contactId, targetElement) {
  const contact = state.contacts.find(c => c.id === contactId);
  if (!contact) return;

  const tooltip = document.getElementById('contact-tooltip');
  const nameEl = document.getElementById('tooltip-contact-name');
  const contentEl = document.getElementById('tooltip-content');

  // Set name
  nameEl.textContent = contact.name || contact.type || 'Unknown Contact';

  // SHIP-6: Get ASCII art for the contact type
  const asciiArt = getShipAsciiArt(contact.ship_type || contact.type);

  // Build tooltip content - start with ASCII art if available
  let content = '';
  if (asciiArt) {
    content += `<pre class="ship-ascii-art">${escapeHtml(asciiArt)}</pre>`;
  }

  content += `
    <div class="tooltip-row">
      <span class="label">Type:</span>
      <span class="value">${contact.type || 'Unknown'}</span>
    </div>
    <div class="tooltip-row">
      <span class="label">Bearing:</span>
      <span class="value">${contact.bearing}°</span>
    </div>
    <div class="tooltip-row">
      <span class="label">Range:</span>
      <span class="value">${formatRange(contact.range_km)} (${formatRangeBand(contact.range_band)})</span>
    </div>
    <div class="tooltip-row">
      <span class="label">Transponder:</span>
      <span class="value">${contact.transponder || 'None'}</span>
    </div>
    <div class="tooltip-row">
      <span class="label">Signature:</span>
      <span class="value">${contact.signature || 'Normal'}</span>
    </div>
  `;

  // GM-only info
  if (state.isGM && contact.gm_notes) {
    content += `
      <div class="tooltip-row gm-only">
        <span class="label">GM Notes:</span>
        <span class="value">${escapeHtml(contact.gm_notes)}</span>
      </div>
    `;
  }

  // Targetable info
  if (contact.is_targetable) {
    content += `
      <div class="tooltip-row">
        <span class="label">Health:</span>
        <span class="value">${contact.health}/${contact.max_health}</span>
      </div>
      <div class="tooltip-row">
        <span class="label">Weapons Free:</span>
        <span class="value">${contact.weapons_free ? 'Yes' : 'No'}</span>
      </div>
    `;
  }

  // TIP-3: UWP tooltip for planets/celestial objects
  if (contact.uwp) {
    content += `
      <div class="tooltip-row">
        <span class="label">UWP:</span>
        <span class="value">${createUWPSpan(contact.uwp)}</span>
      </div>
    `;
  }

  // Stellar info for stars (Factory pattern - star-specific content)
  if (contact.stellar_class || contact.type === 'star') {
    content += getStarPopupContent(contact);
  }

  // Ship-specific info (Factory pattern)
  if (contact.type === 'ship' || contact.type === 'vessel' || contact.tonnage) {
    content += getShipPopupContent(contact);
  }

  // Station-specific info (Factory pattern)
  if (contact.type === 'station' || contact.type === 'starport' || contact.type === 'orbital') {
    content += getStationPopupContent(contact);
  }

  // Trade codes
  if (contact.trade_codes) {
    const codes = typeof contact.trade_codes === 'string' ? JSON.parse(contact.trade_codes) : contact.trade_codes;
    if (codes && codes.length > 0) {
      content += `
        <div class="tooltip-row">
          <span class="label">Trade Codes:</span>
          <span class="value">${escapeHtml(codes.join(', '))}</span>
        </div>
      `;
    }
  }

  // Wiki reference link
  if (contact.wiki_url) {
    content += `
      <div class="tooltip-row">
        <span class="label">Reference:</span>
        <span class="value"><a href="${escapeHtml(contact.wiki_url)}" target="_blank" rel="noopener" class="wiki-link">Traveller Wiki</a></span>
      </div>
    `;
  }

  // Ship weapons (from ship_data or template)
  const shipData = contact.ship_data ? (typeof contact.ship_data === 'string' ? JSON.parse(contact.ship_data) : contact.ship_data) : null;
  if (shipData?.turrets && shipData.turrets.length > 0) {
    const weaponsHtml = formatShipWeapons(shipData);
    if (weaponsHtml) {
      content += `<div class="tooltip-weapons"><strong>Armament:</strong>${weaponsHtml}</div>`;
    }
  }

  // Hail button for ships/stations with transponders (Captain or Sensor Operator)
  const canHail = (state.selectedRole === 'captain' || state.selectedRole === 'sensor_operator' || state.isGM);
  const isHailable = contact.transponder && contact.transponder !== 'NONE' &&
    (contact.type === 'Free Trader' || contact.type === 'Far Trader' ||
     contact.type === 'Station' || contact.type === 'starport' || contact.type === 'Starport' ||
     contact.type === 'orbital' || contact.type === 'System Defense Boat' ||
     contact.type?.toLowerCase().includes('ship') || contact.type?.toLowerCase().includes('trader') ||
     contact.type?.toLowerCase().includes('station') || contact.transponder?.toLowerCase().includes('starport'));

  if (canHail && isHailable) {
    content += `
      <div class="tooltip-actions">
        <button class="btn btn-primary btn-hail" onclick="window.hailContact('${contactId}')">
          📡 Hail ${contact.transponder}
        </button>
      </div>
    `;
  }

  contentEl.innerHTML = content;

  // Position tooltip near target element
  const rect = targetElement.getBoundingClientRect();
  const tooltipWidth = 280;
  let left = rect.right + 10;
  let top = rect.top;

  // Keep tooltip on screen
  if (left + tooltipWidth > window.innerWidth) {
    left = rect.left - tooltipWidth - 10;
  }
  if (top + 200 > window.innerHeight) {
    top = window.innerHeight - 220;
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.classList.remove('hidden');

  // Mark contact as selected
  document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('selected'));
  targetElement.classList.add('selected');
  state.pinnedContactId = contactId;
}

/**
 * Hide contact tooltip
 * @param {Object} state - Application state
 */
export function hideContactTooltip(state) {
  const tooltip = document.getElementById('contact-tooltip');
  tooltip.classList.add('hidden');
  document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('selected'));
  state.pinnedContactId = null;
}

/**
 * Scan a contact (targeted sensor scan)
 * @param {Object} state - Application state
 * @param {string} contactId - Contact ID to scan
 * @param {string} scanType - 'passive', 'active', or 'deep'
 */
export function scanContact(state, contactId, scanType = 'active') {
  const contact = state.contacts.find(c => c.id === contactId);
  if (!contact) {
    showNotification('Contact not found', 'error');
    return;
  }

  // Emit scan event to server
  state.socket.emit('ops:scanContact', { contactId, scanType });
  showNotification(`Initiating ${scanType} scan...`, 'info');
}

/**
 * Hail a contact (ship/station)
 * @param {Object} state - Application state
 * @param {Function} hideTooltipFn - Function to hide tooltip
 * @param {string} contactId - Contact ID to hail
 */
export function hailContact(state, hideTooltipFn, contactId) {
  const contact = state.contacts.find(c => c.id === contactId);
  if (!contact) {
    showNotification('Contact not found', 'error');
    return;
  }

  if (!contact.transponder || contact.transponder === 'NONE') {
    showNotification('Cannot hail - no transponder signal', 'error');
    return;
  }

  // Emit hail event to server
  state.socket.emit('ops:hailContact', { contactId });

  // Close tooltip
  hideTooltipFn();
}

/**
 * Hail selected contact from Captain panel dropdown
 * @param {Object} state - Application state
 * @param {Function} hailContactFn - Bound hailContact function
 */
export function hailSelectedContact(state, hailContactFn) {
  const select = document.getElementById('hail-contact-select');
  if (!select || !select.value) {
    showNotification('No contact selected', 'warning');
    return;
  }
  hailContactFn(select.value);
}

/**
 * Broadcast message to all contacts
 * @param {Object} state - Application state
 */
export function broadcastMessage(state) {
  const messageInput = document.getElementById('comms-message-input');
  const message = messageInput?.value?.trim();

  if (!message) {
    showNotification('Enter a message to broadcast', 'warning');
    return;
  }

  state.socket.emit('ops:broadcastMessage', { message });
  messageInput.value = '';
  showNotification('Broadcast sent', 'info');
}
