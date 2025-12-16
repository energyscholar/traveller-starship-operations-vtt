/**
 * AR-151-3c: Ship Configuration Module
 * AR-48: Display ship technical configuration
 */

/**
 * Show ship configuration modal
 * @param {Object} state - Application state
 * @param {Function} showModalContent - Function to show modal content
 */
export function showShipConfiguration(state, showModalContent) {
  const ship = state.ship || {};
  const template = state.shipTemplate || {};
  const shipData = ship.ship_data || template || {};

  const weapons = shipData.weapons || [];
  const drives = {
    mDrive: shipData.mDrive || shipData.maneuver || '?',
    jDrive: shipData.jDrive || shipData.jumpRating || '?',
    powerPlant: shipData.powerPlant || shipData.power || '?'
  };

  let html = `
    <div class="modal-header">
      <h2>🔧 ${shipData.name || template.name || 'Ship'} Configuration</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body ship-config">
      <div class="config-section">
        <h4>Hull</h4>
        <table class="config-table">
          <tr><td>Tonnage</td><td>${shipData.tonnage || template.tonnage || '?'} dT</td></tr>
          <tr><td>Hull Points</td><td>${shipData.hull || template.hull || '?'}</td></tr>
          <tr><td>Structure</td><td>${shipData.structure || template.structure || '?'}</td></tr>
          <tr><td>Armor</td><td>${shipData.armor || template.armor || 0}</td></tr>
        </table>
      </div>

      <div class="config-section">
        <h4>Drives & Power</h4>
        <table class="config-table">
          <tr><td>Maneuver</td><td>${drives.mDrive}-G</td></tr>
          <tr><td>Jump</td><td>Jump-${drives.jDrive}</td></tr>
          <tr><td>Power Plant</td><td>${drives.powerPlant}</td></tr>
        </table>
      </div>

      <div class="config-section">
        <h4>Fuel & Cargo</h4>
        <table class="config-table">
          <tr><td>Fuel Capacity</td><td>${shipData.fuel || template.fuel || '?'} tons</td></tr>
          <tr><td>Cargo Capacity</td><td>${shipData.cargo || template.cargo || '?'} tons</td></tr>
        </table>
      </div>

      <div class="config-section">
        <h4>Weapons (${weapons.length})</h4>
        ${weapons.length === 0 ? '<div class="config-empty">No weapons installed</div>' : `
        <table class="config-table">
          ${weapons.map(w => `
            <tr>
              <td>${w.name || 'Weapon'}</td>
              <td>${w.damage || '?'} dmg</td>
              <td>${w.mount || 'Turret'}</td>
            </tr>
          `).join('')}
        </table>
        `}
      </div>

      <div class="config-section">
        <h4>Accommodations</h4>
        <table class="config-table">
          <tr><td>Staterooms</td><td>${shipData.staterooms || template.staterooms || '?'}</td></tr>
          <tr><td>Low Berths</td><td>${shipData.lowBerths || template.lowBerths || 0}</td></tr>
        </table>
      </div>
    </div>
  `;

  showModalContent(html);
}
