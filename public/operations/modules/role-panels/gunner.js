/**
 * AR-204: Gunner Role Panel
 * Extracted from role-panels.js for maintainability.
 */

import { escapeHtml } from '../utils.js';

/**
 * Generate Gunner role panel HTML
 * @param {object} shipState - Current ship state
 * @param {object} template - Ship template data
 * @param {array} contacts - Sensor contacts
 * @param {number} roleInstance - Turret assignment
 * @param {array} shipWeapons - Ship weapons array
 * @param {array} combatLog - Combat log entries
 * @param {object} targetConditions - Targeting conditions
 * @returns {string} HTML string
 */
export function getGunnerPanel(shipState, template, contacts, roleInstance = 1, shipWeapons = [], combatLog = [], targetConditions = null) {
  // Use ship_weapons from database if available, else fall back to template
  const weapons = shipWeapons.length > 0 ? shipWeapons : (template.weapons || []);
  const ammo = shipState.ammo || {};

  // AR-208: Fire Control rating from ship software/combat data
  const fireControl = template.combat?.fireControl ||
                      template.software?.fireControl ||
                      (Array.isArray(template.software) ?
                        template.software.find(s => typeof s === 'string' && s.toLowerCase().includes('fire control'))?.match(/\/(\d+)/)?.[1] || 0 :
                        0);
  const fireControlDM = parseInt(fireControl, 10) || 0;

  // Determine turret assignment based on roleInstance
  const turretCount = weapons.filter(w => w.mount === 'turret' || w.type === 'turret' || !w.mount).length;
  const assignedTurret = roleInstance <= turretCount ? roleInstance : null;
  const turretWeapons = assignedTurret ? weapons.filter((w, i) => i === assignedTurret - 1) : weapons;

  // Filter to targetable contacts - AR-53: default is_targetable to true (Gunner override per UQ)
  const hostileContacts = contacts?.filter(c =>
    c.is_targetable !== false
  ) || [];
  const hasTargets = hostileContacts.length > 0;
  const hasWeapons = weapons.length > 0;

  // Selected weapon (from state or first available)
  const selectedWeaponId = shipState.selectedWeapon || (weapons[0]?.id || 0);
  const selectedWeapon = weapons.find(w => (w.id || weapons.indexOf(w)) === selectedWeaponId) || weapons[0];

  // Selected target (from state or first available)
  const selectedTargetId = shipState.lockedTarget || (hostileContacts[0]?.id);
  const selectedTarget = hostileContacts.find(c => c.id === selectedTargetId);

  // Weapon status classes
  const getWeaponStatusClass = (status) => {
    switch (status) {
      case 'ready': return 'weapon-ready';
      case 'fired': return 'weapon-fired';
      case 'damaged': return 'weapon-damaged';
      case 'destroyed': return 'weapon-destroyed';
      default: return 'weapon-ready';
    }
  };

  // Range band DM calculation
  const getRangeDM = (band) => {
    const dms = { adjacent: 1, close: 0, short: 0, medium: -1, long: -2, extreme: -4, distant: -6 };
    return dms[band] ?? -4;
  };

  const formatRangeDM = (dm) => dm >= 0 ? `+${dm}` : `${dm}`;

  // AR-208: Check if weapon is in range for target
  const rangeBandOrder = ['adjacent', 'close', 'short', 'medium', 'long', 'extreme', 'distant'];

  const isWeaponInRange = (weapon, targetRangeBand) => {
    if (!weapon || !targetRangeBand) return true; // Default to usable if unknown
    const weaponType = (weapon.weapon_type || weapon.type || weapon.name || '').toLowerCase();
    const weaponRange = (weapon.range || '').toLowerCase();

    // Sandcasters are defensive/close range only (adjacent to short)
    if (weaponType.includes('sandcaster') || weaponType.includes('sand')) {
      const maxRange = 'short';
      const targetIdx = rangeBandOrder.indexOf(targetRangeBand.toLowerCase());
      const maxIdx = rangeBandOrder.indexOf(maxRange);
      return targetIdx <= maxIdx;
    }

    // Missiles have long range
    if (weaponType.includes('missile')) {
      return true; // Missiles can reach any range
    }

    // Map weapon range string to max band
    const rangeToMaxBand = {
      'close': 'close',
      'short': 'short',
      'medium': 'medium',
      'long': 'long',
      'extreme': 'extreme',
      'distant': 'distant'
    };

    const maxBand = rangeToMaxBand[weaponRange] || 'long'; // Default weapons to long range
    const targetIdx = rangeBandOrder.indexOf(targetRangeBand.toLowerCase());
    const maxIdx = rangeBandOrder.indexOf(maxBand);

    return targetIdx <= maxIdx;
  };

  // AR-15.6: Calculate hit probability (AR-208: includes fire control)
  const calculateHitProbability = (weapon, target, gunnerySkill = 0, fc = 0) => {
    if (!weapon || !target) return null;
    const rangeDM = getRangeDM(target.range_band);
    const totalDM = gunnerySkill + rangeDM + fc;
    // 2D6 >= 8 - DM to hit
    const targetNumber = 8 - totalDM;
    // Probability calculation for 2D6
    let successCount = 0;
    for (let d1 = 1; d1 <= 6; d1++) {
      for (let d2 = 1; d2 <= 6; d2++) {
        if (d1 + d2 >= targetNumber) successCount++;
      }
    }
    return Math.round((successCount / 36) * 100);
  };

  // Calculate hit chance for selected weapon/target (AR-208: includes fire control)
  const gunnerySkill = shipState.gunnerySkill || 0;
  const hitChance = selectedWeapon && selectedTarget
    ? calculateHitProbability(selectedWeapon, selectedTarget, gunnerySkill, fireControlDM)
    : null;

  // Group weapons by type for selector
  const weaponTypes = [...new Set(weapons.map(w => w.weapon_type || w.type || 'beam'))];
  const hasMissiles = weapons.some(w => (w.weapon_type || w.type || '').toLowerCase().includes('missile'));

  // Weapons authorization status
  const weaponsFree = shipState.weaponsAuth?.mode === 'free';

  return `
    <div class="detail-section gunner-header">
      <h4>GUNNER STATION ${assignedTurret ? `- TURRET ${assignedTurret}` : ''}</h4>
      <div class="gunner-header-badges">
        <div class="gunner-status-badge ${weaponsFree ? 'weapons-free' : 'weapons-hold'}"
             title="${weaponsFree ? 'Weapons authorized - engage at will' : 'Weapons secured - await authorization'}">
          ${weaponsFree ? 'WEAPONS FREE' : 'WEAPONS HOLD'}
        </div>
        <div class="fire-control-badge" title="Fire Control software DM applied to all gunnery attacks">
          FC/+${fireControlDM}
        </div>
      </div>
    </div>

    <div class="detail-section gunner-auth-section">
      <h4>Rules of Engagement</h4>
      <div class="weapons-auth-controls" style="display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap;">
        <button onclick="window.captainWeaponsAuth('hold')"
                class="btn btn-small ${shipState.roe === 'hold' ? 'btn-warning active' : 'btn-secondary'}"
                title="HOLD FIRE - No weapons discharge without direct order">
          HOLD
        </button>
        <button onclick="window.captainWeaponsAuth('defensive')"
                class="btn btn-small ${shipState.roe === 'defensive' ? 'btn-info active' : 'btn-secondary'}"
                title="DEFENSIVE - Return fire only when fired upon">
          DEFENSIVE
        </button>
        <button onclick="window.captainWeaponsAuth('free')"
                class="btn btn-small ${shipState.roe === 'free' || weaponsFree ? 'btn-danger active' : 'btn-secondary'}"
                title="WEAPONS FREE - Engage any hostile target at will">
          FREE
        </button>
      </div>
      <small class="auth-hint" style="color: var(--text-muted); margin-top: 4px; display: block;">
        ${shipState.roe === 'free' || weaponsFree ? 'Engage hostile targets at will' :
          shipState.roe === 'defensive' ? 'Return fire when fired upon' :
          'Weapons secured - await authorization'}
      </small>
      <small class="gunner-override-note" style="color: var(--text-muted); font-size: 10px; display: block;">
        Gunner: Override available via FIRE button (logs violation)
      </small>
    </div>

    <div class="detail-section target-section">
      <h4>TARGET PRIORITY QUEUE</h4>
      ${!hasTargets ? `
        <div class="no-target-locked">
          <div class="locked-icon">○</div>
          <div class="no-target-text">No Target Locked</div>
          <small>Awaiting hostile contacts or authorization</small>
        </div>
      ` : `
        <div class="target-list">
          ${hostileContacts
            .map(c => ({
              ...c,
              hitChance: selectedWeapon ? calculateHitProbability(selectedWeapon, c, gunnerySkill, fireControlDM) : 0,
              threat: c.marking === 'hostile' ? 3 : c.marking === 'unknown' ? 2 : 1,
              priority: (c.marking === 'hostile' ? 100 : 50) + (selectedWeapon ? calculateHitProbability(selectedWeapon, c, gunnerySkill, fireControlDM) : 0)
            }))
            .sort((a, b) => b.priority - a.priority)
            .map((c, idx) => {
            const targetHitChance = c.hitChance;
            const threatLevel = c.threat === 3 ? 'HIGH' : c.threat === 2 ? 'MED' : 'LOW';
            const threatClass = c.threat === 3 ? 'text-danger' : c.threat === 2 ? 'text-warning' : 'text-success';
            return `
            <div class="target-item ${c.id === selectedTargetId ? 'selected' : ''}"
                 onclick="lockTarget('${c.id}')" data-contact-id="${c.id}"
                 title="Priority #${idx + 1} - Click to lock${targetHitChance ? ` - ${targetHitChance}% hit chance` : ''}">
              <div class="target-header">
                <span class="target-indicator">${c.id === selectedTargetId ? '◉' : '○'}</span>
                <span class="target-priority" style="font-size: 10px; color: var(--text-muted);">#${idx + 1}</span>
                <span class="target-name">${escapeHtml(c.name || 'Unknown')}</span>
                <span class="target-threat ${threatClass}" title="Threat level">${threatLevel}</span>
              </div>
              <div class="target-details">
                <span class="target-range">${c.range_band || 'Unknown'} (${formatRangeDM(getRangeDM(c.range_band))} DM)</span>
                <span class="target-distance">${c.range_km || '?'}km</span>
                ${targetHitChance !== null ? `<span class="target-hit-chance">${targetHitChance}%</span>` : ''}
              </div>
              <div class="target-health-bar">
                <div class="health-fill" style="width: ${Math.max(0, (c.health / (c.max_health || 100)) * 100)}%"></div>
                <span class="health-text">${c.health || 0}/${c.max_health || 100}</span>
              </div>
            </div>
          `}).join('')}
        </div>
      `}
    </div>

    ${targetConditions ? `
    <div class="detail-section target-conditions">
      <h4>Targeting Conditions</h4>
      <div class="detail-stats">
        ${targetConditions.lockStatus ? `
        <div class="stat-row">
          <span>Lock Status:</span>
          <span class="stat-value ${targetConditions.lockStatus === 'Locked' ? 'text-success' : targetConditions.lockStatus === 'Acquiring' ? 'text-warning' : ''}">${targetConditions.lockStatus}</span>
        </div>
        ` : ''}
        ${targetConditions.ecmEffect ? `
        <div class="stat-row">
          <span>ECM Effect:</span>
          <span class="stat-value ${targetConditions.ecmEffect === 'Heavy' ? 'text-danger' : targetConditions.ecmEffect === 'Moderate' ? 'text-warning' : ''}">${targetConditions.ecmEffect}</span>
        </div>
        ` : ''}
        ${targetConditions.solutionQuality ? `
        <div class="stat-row">
          <span>Firing Solution:</span>
          <span class="stat-value ${targetConditions.solutionQuality === 'Excellent' ? 'text-success' : targetConditions.solutionQuality === 'Poor' ? 'text-danger' : ''}">${targetConditions.solutionQuality}</span>
        </div>
        ` : ''}
        ${targetConditions.targetAspect ? `
        <div class="stat-row">
          <span>Target Aspect:</span>
          <span class="stat-value">${targetConditions.targetAspect}</span>
        </div>
        ` : ''}
        ${targetConditions.trackingMod !== undefined ? `
        <div class="stat-row">
          <span>Tracking Mod:</span>
          <span class="stat-value ${targetConditions.trackingMod < 0 ? 'text-danger' : targetConditions.trackingMod > 0 ? 'text-success' : ''}">${targetConditions.trackingMod >= 0 ? '+' : ''}${targetConditions.trackingMod}</span>
        </div>
        ` : ''}
      </div>
      ${targetConditions.warning ? `
      <div class="targeting-warning" style="margin-top: 8px; padding: 8px; background: rgba(220,53,69,0.15); border-radius: 4px;">
        <strong class="text-danger">⚠ ${escapeHtml(targetConditions.warning)}</strong>
      </div>
      ` : ''}
    </div>
    ` : ''}

    ${selectedWeapon && selectedTarget ? `
    <div class="detail-section fire-solution-section">
      <h4>FIRE SOLUTION</h4>
      <div class="fire-solution-display">
        <div class="solution-modifiers">
          <div class="mod-row"><span>Gunnery Skill:</span><span class="dm-value ${gunnerySkill >= 0 ? 'dm-positive' : 'dm-negative'}">+${gunnerySkill}</span></div>
          ${fireControlDM > 0 ? `<div class="mod-row"><span>Fire Control:</span><span class="dm-value dm-positive">+${fireControlDM}</span></div>` : ''}
          <div class="mod-row"><span>Range (${selectedTarget.range_band || 'Med'}):</span><span class="dm-value ${getRangeDM(selectedTarget.range_band) >= 0 ? 'dm-positive' : 'dm-negative'}">${formatRangeDM(getRangeDM(selectedTarget.range_band))}</span></div>
          ${shipState?.sensorLock?.targetId === selectedTarget.id ? '<div class="mod-row"><span>Sensor Lock:</span><span class="dm-value dm-positive">+2</span></div>' : ''}
          ${selectedTarget.dodge ? `<div class="mod-row"><span>Target Dodge:</span><span class="dm-value dm-negative">-${Math.floor((selectedTarget.thrust || 0) / 2)}</span></div>` : ''}
          <div class="mod-row total"><span>Total DM:</span><span class="dm-value">${formatRangeDM(gunnerySkill + fireControlDM + getRangeDM(selectedTarget.range_band) + (shipState?.sensorLock?.targetId === selectedTarget.id ? 2 : 0))}</span></div>
        </div>
        <div class="solution-result">
          <div class="hit-probability" title="Chance to hit on 2D6 ≥ 8">
            <span class="hit-label">HIT:</span>
            <span class="hit-value ${hitChance >= 70 ? 'text-success' : hitChance >= 40 ? 'text-warning' : 'text-danger'}">${hitChance}%</span>
          </div>
        </div>
      </div>
      <div class="damage-prediction" style="margin-top: 8px; padding: 8px; background: var(--bg-tertiary); border-radius: 4px;">
        ${(() => {
          const isIonWeapon = (selectedWeapon.weapon_type || selectedWeapon.type || selectedWeapon.name || '').toLowerCase().includes('ion');
          const diceCount = parseInt(selectedWeapon.damage) || 2;
          const avgRoll = diceCount * 3.5;
          if (isIonWeapon) {
            // Ion weapons: power drain = (damage + effect) × 10
            const avgPowerDrain = Math.round((avgRoll + 3) * 10); // avg effect ~3
            return `
              <div class="stat-row ion-effect"><span>⚡ ION WEAPON</span><span class="stat-value text-warning">Power Drain</span></div>
              <div class="stat-row"><span>Weapon Dice:</span><span class="stat-value">${selectedWeapon.damage || '2D6'}</span></div>
              <div class="stat-row"><span>Avg Power Drain:</span><span class="stat-value text-warning">${avgPowerDrain} power</span></div>
              <div class="stat-row"><span>Formula:</span><span class="stat-value" style="font-size: 10px;">(damage + effect) × 10</span></div>
            `;
          }
          return `
            <div class="stat-row"><span>Weapon Damage:</span><span class="stat-value">${selectedWeapon.damage || '2D6'}</span></div>
            <div class="stat-row"><span>Target Armour:</span><span class="stat-value">${selectedTarget.armour || 0}</span></div>
            <div class="stat-row"><span>Expected Damage:</span><span class="stat-value">${Math.max(0, avgRoll - (selectedTarget.armour || 0)).toFixed(0)}</span></div>
            ${selectedTarget.health && selectedTarget.max_health ? `
            <div class="stat-row"><span>Shots to Kill:</span><span class="stat-value">${Math.ceil(selectedTarget.health / Math.max(1, avgRoll - (selectedTarget.armour || 0)))}</span></div>
            ` : ''}
          `;
        })()}
      </div>
    </div>
    ` : ''}

    <div class="detail-section weapons-section">
      <h4>WEAPONS</h4>
      ${hasWeapons && weapons.length > 1 ? `
      <div class="weapon-selector-dropdown">
        <label for="weapon-type-select">Active Weapon:</label>
        <select id="weapon-type-select" class="weapon-select" onchange="selectWeaponByIndex(this.value)"
                title="Select weapon to fire">
          ${weapons.map((w, i) => {
            const isAssigned = assignedTurret === null || i === assignedTurret - 1;
            const isMissile = (w.weapon_type || w.type || '').toLowerCase().includes('missile');
            const ammoText = w.ammo_max !== null && w.ammo_max !== undefined ? ` [${w.ammo_current}/${w.ammo_max}]` : '';
            return `<option value="${i}" ${!isAssigned ? 'disabled' : ''} ${(w.id || i) === selectedWeaponId ? 'selected' : ''}>
              ${w.name || 'Weapon ' + (i + 1)}${ammoText}${isMissile ? ' (Missile)' : ''}
            </option>`;
          }).join('')}
        </select>
      </div>
      ` : ''}
      <div class="weapons-grid">
        ${hasWeapons ? weapons.map((w, i) => {
          const isAssigned = assignedTurret === null || i === assignedTurret - 1;
          const isSelected = (w.id || i) === selectedWeaponId;
          const status = w.status || 'ready';
          const hasAmmo = w.ammo_max === null || (w.ammo_current > 0);
          const isMissile = (w.weapon_type || w.type || '').toLowerCase().includes('missile');
          const isIon = (w.weapon_type || w.type || w.name || '').toLowerCase().includes('ion');
          // AR-208: Check if weapon is in range of selected target
          const inRange = !selectedTarget || isWeaponInRange(w, selectedTarget.range_band);
          const outOfRangeReason = !inRange ? `OUT OF RANGE - Target at ${selectedTarget?.range_band || 'unknown'}` : '';
          return `
            <div class="weapon-card ${isAssigned ? 'assigned' : 'unassigned'} ${isSelected ? 'selected' : ''} ${getWeaponStatusClass(status)} ${!inRange ? 'weapon-out-of-range' : ''}"
                 onclick="${inRange ? `selectWeaponByIndex(${i})` : ''}" title="${w.name || 'Weapon ' + (i + 1)}: ${w.damage || '2d6'} damage, ${w.range || 'Medium'} range${isIon ? ' - ION: Drains power instead of hull' : ''}${outOfRangeReason ? ' - ' + outOfRangeReason : ''}">
              <div class="weapon-header">
                <span class="weapon-select-indicator">${isSelected ? '◉' : '○'}</span>
                <span class="weapon-name">${w.name || 'Weapon ' + (i + 1)}</span>
                <span class="weapon-mount">${w.mount || 'Turret'}</span>
                ${isMissile ? '<span class="weapon-type-badge missile">MSL</span>' : ''}
                ${isIon ? '<span class="weapon-type-badge ion" title="Ion weapon: Drains target power instead of hull damage">ION</span>' : ''}
              </div>
              <div class="weapon-stats">
                <span class="weapon-range" title="Optimal engagement range">Range: ${w.range || 'Medium'}</span>
                ${isIon ?
                  `<span class="weapon-damage ion-damage" title="Power drain = (damage + effect) × 10">Power Drain: ${w.damage || '2d6'}</span>` :
                  `<span class="weapon-damage" title="Damage on hit">Damage: ${w.damage || '2d6'}</span>`
                }
              </div>
              ${w.ammo_max !== null && w.ammo_max !== undefined ? `
                <div class="weapon-ammo" title="${w.ammo_current} rounds remaining of ${w.ammo_max}">
                  <span class="ammo-label">Ammo:</span>
                  <span class="ammo-count ${w.ammo_current <= 3 ? 'ammo-low' : ''} ${w.ammo_current === 0 ? 'ammo-empty' : ''}">${w.ammo_current}/${w.ammo_max}</span>
                  ${isMissile && w.ammo_current > 0 ? '<span class="ammo-ready">LOADED</span>' : ''}
                  ${w.ammo_current === 0 ? '<span class="ammo-depleted">DEPLETED</span>' : ''}
                </div>
              ` : ''}
              ${!inRange ? `<div class="weapon-out-of-range-notice">OUT OF RANGE</div>` : ''}
              <div class="weapon-status-indicator">${!inRange ? 'OUT OF RANGE' : status.toUpperCase()}</div>
            </div>
          `;
        }).join('') : '<div class="placeholder">No weapons configured</div>'}
      </div>
    </div>

    <div class="detail-section fire-control-section">
      ${hitChance !== null && hasTargets && selectedWeapon ? `
      <div class="fire-solution" style="background: var(--panel-bg); padding: 8px; border-radius: 4px; margin-bottom: 8px;">
        <div class="hit-probability-display" title="Calculated from: 2D6 + Gunnery ${gunnerySkill >= 0 ? '+' : ''}${gunnerySkill} + FC +${fireControlDM} + Range DM ${formatRangeDM(getRangeDM(selectedTarget?.range_band))} >= 8">
          <span class="hit-label">Hit Chance:</span>
          <span class="hit-value ${hitChance >= 70 ? 'hit-high' : hitChance >= 40 ? 'hit-medium' : 'hit-low'}">${hitChance}%</span>
        </div>
        <div class="damage-prediction" style="margin-top: 4px;">
          <span style="color: var(--text-muted);">Expected Damage:</span>
          <span style="color: var(--danger); font-weight: bold;">${selectedWeapon.damage || '2d6'}</span>
          <span style="color: var(--text-muted); font-size: 11px;">(avg ~${Math.round(((selectedWeapon.damage || '2d6').match(/(\d+)d(\d+)/)?.[1] * (parseInt((selectedWeapon.damage || '2d6').match(/(\d+)d(\d+)/)?.[2]) + 1) / 2) || 7)})</span>
        </div>
      </div>
      ` : ''}
      <div class="called-shot-selector" style="margin-bottom: 8px;">
        <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-muted);">
          <span>Called Shot:</span>
          <select id="called-shot-target" style="flex: 1; padding: 4px; background: var(--panel-bg); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font-size: 11px;">
            <option value="">Normal Shot (no penalty)</option>
            <option value="mDrive">M-Drive (DM -2) - prevent escape</option>
            <option value="jDrive">J-Drive (DM -4) - prevent jump</option>
            <option value="powerPlant">Power Plant (DM -4) - cripple ship</option>
            <option value="sensors">Sensors (DM -2) - blind target</option>
            <option value="weapon">Weapons (DM -2) - disarm</option>
            <option value="computer">Computer (DM -3) - disable fire control</option>
            <option value="fuel">Fuel (DM -2) - strand ship</option>
          </select>
        </label>
      </div>
      <div class="fire-buttons" style="display: flex; gap: 5px; flex-wrap: wrap;">
        <button onclick="fireWeapon()" class="btn btn-danger btn-fire"
                title="${hasTargets ? `Fire ${selectedWeapon?.name || 'weapon'} at ${selectedTarget?.name || 'target'}${hitChance ? ` (${hitChance}% hit chance)` : ''}` : 'No target locked - awaiting hostile contacts or authorization'}"
                ${!hasTargets || !hasWeapons ? 'disabled' : ''}>
          ${selectedWeapon && (selectedWeapon.weapon_type || selectedWeapon.type || '').toLowerCase().includes('missile') ? 'LAUNCH!' : 'FIRE!'}
        </button>
        ${weapons.length > 1 ? `
        <button onclick="window.fireAllWeapons()" class="btn btn-danger"
                title="Fire all ready weapons at locked target"
                ${!hasTargets || !hasWeapons ? 'disabled' : ''}>
          FIRE ALL
        </button>
        ` : ''}
        <button onclick="togglePointDefense()" class="btn btn-warning btn-point-defense"
                title="Point Defense: Automatically intercept incoming missiles. Uses ammo each round."
                ${!hasWeapons ? 'disabled' : ''}>
          Point Defense
        </button>
      </div>
    </div>

    <div class="detail-section gunner-reference-section">
      <h4>TACTICAL REFERENCE</h4>
      <div class="action-buttons" style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button onclick="window.showWeaponsReference()" class="btn btn-small btn-info"
                title="Open weapons reference - damage, ranges, and tactical tips">
          Weapons Guide
        </button>
        <button onclick="window.showRangeChart()" class="btn btn-small btn-secondary"
                title="Range bands and DM modifiers">
          Range Chart
        </button>
      </div>
    </div>

    <div class="detail-section combat-log-section">
      <h4>FIRE LOG</h4>
      <div class="combat-log-list" id="gunner-combat-log">
        ${combatLog.length > 0 ? combatLog.slice(0, 10).map(entry => {
          const time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--';
          const isHit = entry.action === 'hit' || (entry.roll_data?.hit === true);
          const isMiss = entry.action === 'miss' || (entry.roll_data?.hit === false);
          return `
            <div class="log-entry ${isHit ? 'log-hit' : ''} ${isMiss ? 'log-miss' : ''}">
              <span class="log-time">[${time}]</span>
              <span class="log-message">${escapeHtml(entry.result || entry.action || '')}</span>
            </div>
          `;
        }).join('') : `
          <div class="log-entry log-empty">No combat actions recorded</div>
        `}
      </div>
    </div>

    <div class="detail-section gunner-skill-note">
      <small>Attack: 2D6 + Gunnery skill + Range DM >= 8 to hit | Critical: Effect 6+</small>
    </div>
  `;
}
