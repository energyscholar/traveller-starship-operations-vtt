/**
 * AR-204: Sensor Operator Role Panel
 * Extracted from role-panels.js for maintainability.
 */

import { escapeHtml } from '../utils.js';

/**
 * Generate Sensor Operator role panel HTML
 * @param {object} shipState - Current ship state
 * @param {array} contacts - Sensor contacts
 * @param {object} environmentalData - Environmental monitoring data
 * @returns {string} HTML string
 */
export function getSensorOperatorPanel(shipState, contacts, environmentalData = null) {
  // Categorize contacts for display
  const celestials = contacts?.filter(c => c.celestial) || [];
  const stations = contacts?.filter(c => !c.celestial && c.type && ['Station', 'Starport', 'Base'].includes(c.type)) || [];
  const ships = contacts?.filter(c => !c.celestial && c.type && ['Ship', 'Patrol'].includes(c.type)) || [];
  const unknowns = contacts?.filter(c => !c.celestial && (!c.type || c.type === 'unknown')) || [];

  // AR-138: Count threats for status display
  const threats = contacts?.filter(c =>
    !c.celestial && (c.marking === 'hostile' || (c.type === 'Ship' && c.marking === 'unknown'))
  ) || [];
  const totalContacts = (contacts?.length || 0) - celestials.length;

  // AR-138: Get panel mode from global state
  const panelMode = window.state?.sensorPanelMode || 'collapsed';

  // AR-138: EW status for collapsed display
  const ecmActive = shipState?.ecm || shipState?.ecmActive || false;
  const eccmActive = shipState?.eccm || shipState?.eccmActive || false;
  const stealthActive = shipState?.stealth || false;
  const sensorLock = shipState?.sensorLock || null;

  // AR-138: Collapsed mode - single line status
  if (panelMode === 'collapsed') {
    const statusIcon = threats.length > 0 ? '🔴' : (unknowns.length > 0 ? '🟡' : '🟢');
    const statusText = threats.length > 0 ? 'THREATS' : (totalContacts > 0 ? 'Clear' : 'Clear');
    const ewStatus = [];
    if (stealthActive) ewStatus.push('Stealth');
    if (ecmActive) ewStatus.push('ECM');
    if (eccmActive) ewStatus.push('ECCM');
    if (sensorLock) ewStatus.push('🎯Lock');

    return `
      <div class="sensor-panel-collapsed" onclick="toggleSensorPanelMode('expanded')" style="cursor: pointer;">
        <div class="sensor-status-bar" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-secondary); border-radius: 6px;">
          <div class="sensor-status-left" style="display: flex; align-items: center; gap: 12px;">
            <span class="status-icon" style="font-size: 1.2em;">${statusIcon}</span>
            <span class="status-text" style="font-weight: 600;">${statusText}</span>
            <span class="contact-count" style="color: var(--text-muted);">
              ${totalContacts > 0 ? `👁 ${totalContacts} contact${totalContacts !== 1 ? 's' : ''}` : 'No contacts'}
            </span>
            ${threats.length > 0 ? `<span class="threat-count" style="color: var(--danger);">⚔ ${threats.length} threat${threats.length !== 1 ? 's' : ''}</span>` : ''}
          </div>
          <div class="sensor-status-right" style="display: flex; align-items: center; gap: 8px;">
            ${ewStatus.length > 0 ? `<span class="ew-status" style="font-size: 0.85em; color: var(--warning);">${ewStatus.join(' | ')}</span>` : ''}
            <span class="expand-hint" style="color: var(--text-muted); font-size: 0.85em;">▼ Expand</span>
          </div>
        </div>
      </div>
    `;
  }

  // Scan level labels
  const scanLevelLabels = ['Unknown', 'Passive', 'Active', 'Deep'];

  // AR-55: Range band to KM conversion for tooltips
  const rangeBandKm = {
    Adjacent: '< 1 km',
    Close: '1-10 km',
    Short: '10-1,250 km',
    Medium: '1,250-10,000 km',
    Long: '10,000-25,000 km',
    VeryLong: '25,000-50,000 km',
    Distant: '50,000+ km'
  };

  // AR-55: Compact single-line contact rendering
  const renderContactCompact = (c) => {
    const scanLevel = c.scan_level || 0;
    const scanClass = scanLevel === 0 ? 'undetected' : scanLevel === 1 ? 'passive' : scanLevel === 2 ? 'active' : 'deep';
    const showName = scanLevel >= 2;
    const name = showName ? escapeHtml(c.name || c.transponder || '???') : `C-${(c.id || '').slice(0,4)}`;
    const type = scanLevel >= 1 ? (c.type || '???') : '???';
    const rangeKm = rangeBandKm[c.range_band] || c.range_band || '???';
    const tooltip = `${name}\\nType: ${type}\\nRange: ${c.range_band} (${rangeKm})\\nBearing: ${c.bearing || 0}°\\nScan: ${scanLevelLabels[scanLevel]}${c.tonnage && scanLevel >= 3 ? `\\nTonnage: ${c.tonnage} dT` : ''}`;

    return `
      <div class="sensor-contact-compact ${scanClass}" data-contact-id="${c.id}" title="${tooltip}" onclick="window.showContactTooltip && showContactTooltip('${c.id}')">
        <span class="contact-type-icon type-${type.toLowerCase()}">${type.charAt(0)}</span>
        <span class="contact-name-compact">${name}</span>
        <span class="contact-range-compact">${c.range_band || '???'}</span>
        ${scanLevel < 3 ? `<span class="scan-indicator" onclick="event.stopPropagation(); scanContact('${c.id}', ${scanLevel + 1})">◎</span>` : ''}
      </div>
    `;
  };

  // Legacy detailed contact rendering (for expanded view)
  const renderContact = (c) => {
    const scanLevel = c.scan_level || 0;
    const scanClass = scanLevel === 0 ? 'undetected' : scanLevel === 1 ? 'passive' : scanLevel === 2 ? 'active' : 'deep';

    // What info to show based on scan level
    const showType = scanLevel >= 1;
    const showName = scanLevel >= 2;
    const showDetails = scanLevel >= 3;

    return `
      <div class="sensor-contact ${scanClass}" data-contact-id="${c.id}">
        <div class="contact-header">
          <span class="contact-designator">${showName ? escapeHtml(c.name || c.transponder || 'Unknown') : `Contact ${c.id?.slice(0,4) || '???'}`}</span>
          <span class="contact-range">${c.range_band || 'Unknown'}</span>
        </div>
        <div class="contact-details">
          ${showType ? `<span class="contact-type">${c.type || 'Unknown'}</span>` : '<span class="contact-type">???</span>'}
          <span class="contact-bearing">${c.bearing || 0}°</span>
          <span class="contact-scan-level scan-${scanClass}">${scanLevelLabels[scanLevel]}</span>
        </div>
        ${showDetails && c.tonnage ? `<div class="contact-tonnage">${c.tonnage} dT</div>` : ''}
        ${scanLevel < 3 ? `
          <button class="btn btn-tiny" onclick="scanContact('${c.id}', ${scanLevel + 1})">
            ${scanLevel < 2 ? 'Active Scan' : 'Deep Scan'}
          </button>
        ` : ''}
      </div>
    `;
  };

  // AR-36: ECM/ECCM state - variables already declared above for collapsed mode
  const sensorGrade = shipState?.sensorGrade || 'civilian';

  // AR-138: Mode indicator for expanded/combat
  const modeLabel = panelMode === 'combat' ? 'COMBAT' : 'EXPANDED';

  // AR-138: Build contact data for mini radar
  const radarContacts = contacts?.filter(c => !c.celestial).map(c => ({
    id: c.id,
    bearing: c.bearing || 0,
    range_km: c.range_km || 50000,
    marking: c.marking || 'unknown',
    type: c.type || 'unknown',
    name: c.name || c.transponder || `C-${(c.id || '').slice(0,4)}`
  })) || [];

  return `
    <div class="sensor-panel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 4px 8px; background: var(--bg-tertiary); border-radius: 4px;">
      <span style="font-weight: 600; font-size: 0.9em;">📡 SENSORS ${panelMode === 'combat' ? '<span style="color: var(--danger);">[COMBAT]</span>' : ''}</span>
      <button onclick="toggleSensorPanelMode('collapsed')" class="btn btn-tiny btn-secondary" title="Collapse panel">▲ Collapse</button>
    </div>

    <!-- AR-138: Mini Radar Display -->
    <div class="detail-section mini-radar-section" style="margin-bottom: 12px;">
      <div class="mini-radar-container" style="display: flex; justify-content: center; align-items: center;">
        <canvas id="sensor-mini-radar" width="200" height="200" style="background: #0a0a12; border-radius: 50%; border: 2px solid var(--border-color);"></canvas>
      </div>
      <div class="radar-legend" style="display: flex; justify-content: center; gap: 12px; margin-top: 6px; font-size: 0.75em; color: var(--text-muted);">
        <span><span style="color: #4f4;">●</span> Friendly</span>
        <span><span style="color: #f44;">●</span> Hostile</span>
        <span><span style="color: #ff4;">●</span> Unknown</span>
        <span><span style="color: #48f;">●</span> Neutral</span>
      </div>
      <script>
        if (typeof renderMiniRadar === 'function') {
          setTimeout(() => renderMiniRadar(${JSON.stringify(radarContacts)}, 50000), 0);
        }
      </script>
    </div>

    <!-- AR-138.4: Emissions Meter -->
    <div class="detail-section emissions-section" style="margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span style="font-size: 0.85em; font-weight: 500;">EMISSIONS</span>
        <span style="font-size: 0.75em; color: var(--text-muted);">
          ${stealthActive ? 'Low Profile (-4 DM)' : ecmActive ? 'Active Jamming' : 'Normal'}
        </span>
      </div>
      <div class="emissions-bar" style="background: var(--bg-tertiary); border-radius: 4px; height: 8px; overflow: hidden;">
        <div style="height: 100%; width: ${stealthActive ? '20' : ecmActive ? '60' : '100'}%; background: ${stealthActive ? 'var(--success)' : ecmActive ? 'var(--warning)' : 'var(--info)'}; transition: width 0.3s, background 0.3s;"></div>
      </div>
      <div style="font-size: 0.7em; color: var(--text-muted); margin-top: 2px;">
        ${stealthActive ? '⚠ Active scan would reveal position' : ecmActive ? 'Jamming active - easier to detect but harder to target' : 'Full emissions - visible on passive scans'}
      </div>
    </div>

    <div class="detail-section">
      <h4>Sensor Controls</h4>
      <!-- AR-208: Scan Mode Indicator -->
      <div class="scan-mode-indicator" style="margin-bottom: 8px; padding: 6px 10px; background: var(--bg-secondary); border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.85em; color: var(--text-muted);">Current Mode:</span>
        <span id="scan-mode-display" class="scan-mode ${shipState?.scanMode || 'passive'}" style="font-weight: bold; padding: 2px 8px; border-radius: 3px; ${
          (shipState?.scanMode === 'active') ? 'background: var(--warning); color: var(--bg-dark);' :
          (shipState?.scanMode === 'deep') ? 'background: var(--danger); color: white;' :
          'background: var(--success); color: var(--bg-dark);'
        }">
          ${(shipState?.scanMode === 'active') ? '📡 ACTIVE' :
            (shipState?.scanMode === 'deep') ? '🔬 DEEP SCAN' :
            '👁 PASSIVE'}
        </span>
      </div>
      <div class="sensor-scan-buttons" style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button onclick="setScanMode('passive')" class="btn btn-small ${(shipState?.scanMode || 'passive') === 'passive' ? 'btn-success active' : ''}" title="Passive Mode: Listen only. Detects transponders and large objects. Does NOT reveal your position.">
          👁 Passive
        </button>
        <button onclick="setScanMode('active')" class="btn btn-small ${shipState?.scanMode === 'active' ? 'btn-warning active' : 'btn-warning'}" title="Active Mode: Full sensor sweep. Detects all contacts with detailed info. WARNING: Reveals your position to other ships!">
          📡 Active
        </button>
        <button onclick="performScan('deep')" class="btn btn-small btn-danger" title="Deep Scan: One-time detailed analysis of all contacts. Gets maximum info but DEFINITELY reveals position.">
          🔬 Deep Scan
        </button>
      </div>
      <div class="scan-mode-info" style="margin-top: 6px; font-size: 0.8em; padding: 6px; background: var(--bg-tertiary); border-radius: 4px;">
        ${(shipState?.scanMode === 'active') ?
          '<span class="text-warning">⚠ ACTIVE: Your position is being broadcast. Other ships can detect you.</span>' :
          (shipState?.scanMode === 'deep') ?
          '<span class="text-danger">⚠ DEEP SCAN: Maximum emissions. All ships in range can locate you.</span>' :
          '<span class="text-success">✓ PASSIVE: Listening only. Position hidden unless actively scanned.</span>'}
      </div>
    </div>

    <!-- AR-138.5: Context-sensitive EW controls - show ECM/ECCM only when ships present -->
    <div class="detail-section ecm-section">
      <h4>Electronic Warfare</h4>
      <div class="ecm-status">
        <div class="stat-row">
          <span>Sensor Grade:</span>
          <span class="stat-value ${sensorGrade === 'military' ? 'text-success' : ''}">${sensorGrade === 'military' ? 'Military (+2 DM)' : 'Civilian (+0 DM)'}</span>
        </div>
      </div>
      <div class="ecm-controls" style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
        ${ships.length > 0 || threats.length > 0 ? `
          <button id="btn-ecm" onclick="window.toggleECM()" class="btn btn-small ${ecmActive ? 'btn-danger' : 'btn-secondary'}" title="ECM: Jamming gives enemies -2 DM to sensor checks against us">
            ECM ${ecmActive ? 'ON' : 'OFF'}
          </button>
          <button id="btn-eccm" onclick="window.toggleECCM()" class="btn btn-small ${eccmActive ? 'btn-success' : 'btn-secondary'}" title="ECCM: Counter-jamming negates enemy ECM (-2 penalty)">
            ECCM ${eccmActive ? 'ON' : 'OFF'}
          </button>
        ` : ''}
        <button id="btn-stealth" onclick="window.toggleStealth()" class="btn btn-small ${stealthActive ? 'btn-warning' : 'btn-secondary'}" title="Stealth: Reduce emissions to avoid detection">
          Stealth ${stealthActive ? 'ON' : 'OFF'}
        </button>
      </div>
      ${sensorLock ? `
        <div class="sensor-lock-status" style="margin-top: 8px; padding: 6px; background: var(--bg-tertiary); border-left: 3px solid var(--success); border-radius: 4px;">
          <strong>LOCK:</strong> ${escapeHtml(sensorLock.targetName || sensorLock.targetId)}
          <span class="lock-bonus">(+2 Attack DM)</span>
          <button id="btn-break-lock" onclick="window.breakSensorLock()" class="btn btn-tiny btn-secondary" style="margin-left: 8px;">Break</button>
        </div>
      ` : `
        <div class="sensor-lock-hint" style="margin-top: 8px; color: var(--text-muted); font-size: 0.85em;">
          Click a contact below to acquire sensor lock (+2 Attack DM)
        </div>
      `}
      <!-- AR-208: ECM Reaction capability -->
      <div class="ecm-reaction-section" style="margin-top: 12px; padding: 8px; background: var(--bg-secondary); border-radius: 4px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.85em; font-weight: 500;">ECM Reaction</span>
          <span class="ecm-reaction-status" style="font-size: 0.75em; color: ${shipState?.ecmReactionReady ? 'var(--success)' : 'var(--text-muted)'};">
            ${shipState?.ecmReactionReady ? '✓ READY' : '○ Not Prepared'}
          </span>
        </div>
        <div style="font-size: 0.75em; color: var(--text-muted); margin: 4px 0;">
          When attacked, use ECM as a reaction (-2 to incoming attack)
        </div>
        <button onclick="window.prepareECMReaction()" class="btn btn-small ${shipState?.ecmReactionReady ? 'btn-success active' : 'btn-secondary'}" style="width: 100%; margin-top: 4px;" title="Prepare to use ECM as a reaction when attacked. Uses your reaction for the round.">
          ${shipState?.ecmReactionReady ? '⚡ ECM Reaction READY' : 'Prepare ECM Reaction'}
        </button>
        ${shipState?.ecmReactionUsed ? '<div style="font-size: 0.75em; color: var(--warning); margin-top: 4px;">Used this round - resets next round</div>' : ''}
      </div>
    </div>
    <div class="detail-section sensor-contacts-section">
      <h4>Contacts (${contacts?.length || 0})</h4>
      <div class="sensor-contacts-compact">
        ${ships.length > 0 ? `<div class="category-label">Ships</div>${ships.map(renderContactCompact).join('')}` : ''}
        ${stations.length > 0 ? `<div class="category-label">Stations</div>${stations.map(renderContactCompact).join('')}` : ''}
        ${unknowns.length > 0 ? `<div class="category-label">Unknown</div>${unknowns.map(renderContactCompact).join('')}` : ''}
        ${celestials.length > 0 ? `<div class="category-label">Celestial</div>${celestials.map(c => `
          <div class="sensor-contact-compact celestial" title="${escapeHtml(c.name || 'Body')}\\nType: ${c.type || 'Planet'}">
            <span class="contact-type-icon type-celestial">★</span>
            <span class="contact-name-compact">${escapeHtml(c.name || 'Body')}</span>
            <span class="contact-range-compact">${c.type || 'Planet'}</span>
          </div>
        `).join('')}` : ''}
        ${(!contacts || contacts.length === 0) ? '<div class="placeholder">No contacts</div>' : ''}
      </div>
    </div>
    <div id="scan-result-display" class="scan-result-display" style="display: none;">
      <!-- Populated by scan results -->
    </div>
    ${ships.length > 0 ? `
    <div class="detail-section">
      <h4>Threat Assessment</h4>
      <div class="threat-list">
        ${ships.filter(c => c.scan_level >= 2).map(c => {
          const threat = c.marking === 'hostile' ? 'HIGH' : c.marking === 'unknown' ? 'UNKNOWN' : 'LOW';
          const threatClass = threat === 'HIGH' ? 'text-danger' : threat === 'UNKNOWN' ? 'text-warning' : 'text-success';
          return `
            <div class="threat-item" style="display: flex; justify-content: space-between; padding: 3px 0;">
              <span>${escapeHtml(c.name || c.transponder || 'Contact')}</span>
              <span class="${threatClass}">${threat}</span>
            </div>
          `;
        }).join('') || '<div class="placeholder">Scan ships to assess threats</div>'}
      </div>
    </div>
    ` : ''}
    ${environmentalData ? `
    <div class="detail-section environmental-monitoring">
      <h4>Environmental Monitoring</h4>
      <div class="detail-stats">
        ${environmentalData.temperature !== undefined ? `
        <div class="stat-row">
          <span>Temperature:</span>
          <span class="stat-value ${environmentalData.temperature > 100 ? 'text-danger' : environmentalData.temperature < -20 ? 'text-info' : ''}">${environmentalData.temperature}°C</span>
        </div>
        ` : ''}
        ${environmentalData.atmosphere ? `
        <div class="stat-row">
          <span>Atmosphere:</span>
          <span class="stat-value ${environmentalData.atmosphereToxic ? 'text-danger' : ''}">${escapeHtml(environmentalData.atmosphere)}</span>
        </div>
        ` : ''}
        ${environmentalData.visibility ? `
        <div class="stat-row">
          <span>Visibility:</span>
          <span class="stat-value ${environmentalData.visibility === 'Poor' || environmentalData.visibility === 'Zero' ? 'text-warning' : ''}">${environmentalData.visibility}</span>
        </div>
        ` : ''}
        ${environmentalData.radiation !== undefined ? `
        <div class="stat-row">
          <span>Radiation:</span>
          <span class="stat-value ${environmentalData.radiation > 50 ? 'text-danger' : environmentalData.radiation > 20 ? 'text-warning' : ''}">${environmentalData.radiation} mSv/h</span>
        </div>
        ` : ''}
      </div>
      ${environmentalData.hazards && environmentalData.hazards.length > 0 ? `
      <div class="hazard-alerts" style="margin-top: 8px;">
        <div class="alert-header" style="font-weight: bold; color: var(--danger);">⚠ Active Hazards</div>
        ${environmentalData.hazards.map(h => `
          <div class="hazard-item" style="padding: 4px 8px; background: rgba(255,0,0,0.1); border-radius: 4px; margin: 4px 0;">
            <span class="hazard-name">${escapeHtml(h.name)}</span>
            ${h.distance ? `<span class="hazard-distance" style="float: right;">${h.distance}</span>` : ''}
            ${h.eta ? `<div class="hazard-eta text-warning" style="font-size: 0.85em;">ETA: ${h.eta}</div>` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}
      ${environmentalData.prediction ? `
      <div class="prediction-alert" style="margin-top: 8px; padding: 8px; background: rgba(255,165,0,0.15); border-radius: 4px;">
        <strong>Prediction:</strong> ${escapeHtml(environmentalData.prediction)}
      </div>
      ` : ''}
    </div>
    ` : ''}
    <div class="detail-section sensor-skill-note">
      <small><em>Your Electronics (sensors) skill affects detection range and accuracy</em></small>
    </div>
  `;
}
