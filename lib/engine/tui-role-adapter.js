/**
 * TUI Role Adapter
 *
 * Subscribes to role engine events and renders ANSI-formatted output.
 * Bridges role engines to terminal display.
 *
 * @module lib/engine/tui-role-adapter
 */

const { EventBus } = require('./event-bus');

// ANSI codes
const ESC = '\x1b';
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const RESET = `${ESC}[0m`;
const GREEN = `${ESC}[32m`;
const RED = `${ESC}[31m`;
const YELLOW = `${ESC}[33m`;
const CYAN = `${ESC}[36m`;
const MAGENTA = `${ESC}[35m`;
const WHITE = `${ESC}[37m`;
const BLUE = `${ESC}[34m`;

/**
 * Role-specific colors and icons
 */
const ROLE_STYLES = {
  captain: { color: YELLOW, icon: '⚓' },
  pilot: { color: CYAN, icon: '🚀' },
  gunner: { color: RED, icon: '🎯' },
  engineer: { color: GREEN, icon: '⚙' },
  sensors: { color: BLUE, icon: '📡' },
  damage_control: { color: MAGENTA, icon: '🔧' }
};

class TUIRoleAdapter {
  /**
   * Create adapter
   * @param {Object} options
   * @param {EventBus} options.eventBus - Shared event bus
   * @param {Function} options.output - Output function (default: console.log)
   * @param {boolean} options.verbose - Show detailed modifiers
   * @param {Object} options.engines - Map of role -> engine instances
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus || new EventBus();
    this.output = options.output || console.log;
    this.verbose = options.verbose ?? true;
    this.engines = options.engines || {};
    this.unsubscribers = [];
  }

  /**
   * Register a role engine
   */
  registerEngine(role, engine) {
    this.engines[role] = engine;
  }

  /**
   * Start listening to all role events
   */
  connect() {
    // Subscribe to events from all roles
    const roles = ['captain', 'pilot', 'gunner', 'engineer', 'sensors', 'damage_control'];

    for (const role of roles) {
      // Subscribe to all events for this role
      const sub = this.eventBus.subscribe(`${role}:*`, (event) => {
        this.handleRoleEvent(role, event);
      });
      this.unsubscribers.push(sub);

      // Subscribe to specific action events
      this.subscribeToRoleActions(role);
    }
  }

  /**
   * Subscribe to specific role action events
   */
  subscribeToRoleActions(role) {
    const actions = this.getRoleActions(role);

    for (const action of actions) {
      const eventType = `${role}:${action}`;
      const sub = this.eventBus.subscribe(eventType, (event) => {
        this.renderAction(role, action, event);
      });
      this.unsubscribers.push(sub);
    }
  }

  /**
   * Get known actions for a role
   */
  getRoleActions(role) {
    const actionMap = {
      captain: ['tactics', 'leadership', 'coordinate', 'issue_order', 'weapons_free', 'weapons_hold', 'evasive_all', 'ram'],
      pilot: ['maintain', 'close', 'open', 'evade', 'flee'],
      gunner: ['fire_primary', 'fire_secondary', 'fire_missiles', 'point_defense'],
      engineer: ['boost_power', 'damage_control', 'emergency_power', 'repair_hull', 'redistribute_power'],
      sensors: ['active_scan', 'passive_scan', 'ecm', 'eccm', 'target_lock', 'break_lock'],
      damage_control: ['repair_hull', 'repair_system', 'firefighting', 'seal_breach', 'emergency_bulkhead', 'damage_assessment']
    };
    return actionMap[role] || [];
  }

  /**
   * Stop listening to events
   */
  disconnect() {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }

  /**
   * Handle any role event
   */
  handleRoleEvent(role, event) {
    // Generic handler - renderAction handles specifics
  }

  /**
   * Render an action result
   */
  renderAction(role, action, event) {
    const style = ROLE_STYLES[role] || { color: WHITE, icon: '•' };
    const { data } = event;

    if (!data || !data.result) return;

    const result = data.result;
    const shipName = data.ship?.name || 'Ship';

    // Build output line
    let line = `${style.color}${style.icon} ${this.formatRoleName(role)}${RESET} `;
    line += this.formatActionResult(role, action, result);

    // Add skill check details if verbose
    if (this.verbose && result.check) {
      line += ` ${DIM}[${result.check.roll}+${result.check.skillLevel}+${result.check.totalDM}=${result.check.total} vs ${result.check.difficulty}]${RESET}`;
    }

    this.output(line);

    // Additional output for specific results
    this.renderActionDetails(role, action, result);
  }

  /**
   * Format action-specific result
   */
  formatActionResult(role, action, result) {
    // Success/failure indicator
    const success = result.success !== false;
    const indicator = success ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;

    switch (action) {
      // Captain actions
      case 'tactics':
        return result.bonus > 0
          ? `${indicator} Tactics: ${GREEN}+${result.bonus}${RESET} initiative bonus`
          : `${indicator} Tactics: ${DIM}no bonus${RESET}`;

      case 'leadership':
        return result.boosted
          ? `${indicator} Leadership: ${GREEN}+${result.bonus}${RESET} to all crew`
          : `${indicator} Leadership: ${DIM}failed${RESET}`;

      case 'coordinate':
        return result.coordinated
          ? `${indicator} Coordinating: ${CYAN}${result.roles.join(' + ')}${RESET}`
          : `${indicator} Coordination: ${DIM}failed${RESET}`;

      case 'ram':
        return result.hit
          ? `${indicator} ${RED}RAMMING!${RESET} ${result.target} ${YELLOW}-${result.ramDamage}${RESET} (self: ${YELLOW}-${result.selfDamage}${RESET})`
          : `${indicator} Ram: ${DIM}missed${RESET}`;

      // Pilot actions
      case 'close':
        return `${indicator} Closing: ${result.oldRange} → ${CYAN}${result.newRange}${RESET}`;

      case 'open':
        return `${indicator} Opening: ${result.oldRange} → ${CYAN}${result.newRange}${RESET}`;

      case 'evade':
        return `${indicator} ${CYAN}Evasive maneuvers${RESET} (${result.defensePenalty} to hit)`;

      case 'flee':
        return result.escaped
          ? `${indicator} ${GREEN}ESCAPED!${RESET}`
          : `${indicator} Escape attempt: ${DIM}blocked${RESET}`;

      case 'maintain':
        return `${indicator} Maintaining ${CYAN}${result.range}${RESET} range`;

      // Gunner actions
      case 'fire_primary':
      case 'fire_secondary':
      case 'fire_missiles':
        return result.hit
          ? `${indicator} ${result.weapon} → ${GREEN}HIT${RESET} ${result.target || ''} ${YELLOW}-${result.damage || 0}${RESET}`
          : `${indicator} ${result.weapon} → ${DIM}MISS${RESET}`;

      case 'point_defense':
        return result.intercepted
          ? `${indicator} ${CYAN}Missile intercepted!${RESET}`
          : `${indicator} Point defense: ${DIM}missed${RESET}`;

      // Engineer actions
      case 'boost_power':
        return result.boosted
          ? `${indicator} Power boost: ${GREEN}+${result.boostAmount}${RESET} (now ${result.newPower})`
          : `${indicator} Power boost: ${DIM}failed${RESET}`;

      case 'damage_control':
        return result.repaired
          ? `${indicator} Repaired ${CYAN}${result.system}${RESET} (${result.remainingDamage} damage left)`
          : `${indicator} Repair ${result.system}: ${DIM}failed${RESET}`;

      case 'emergency_power':
        return `${indicator} ${YELLOW}Emergency power!${RESET} +${result.boostAmount} (stress: ${result.stress}/3)`;

      case 'repair_hull':
        return result.repaired
          ? `${indicator} Hull repair: ${GREEN}+${result.hullRestored}${RESET} (now ${result.newHull})`
          : `${indicator} Hull repair: ${DIM}failed${RESET}`;

      // Sensors actions
      case 'active_scan':
        return `${indicator} Active scan: ${CYAN}${result.detected?.length || 0}${RESET} contacts`;

      case 'passive_scan':
        return `${indicator} Passive scan: ${CYAN}${result.detected?.length || 0}${RESET} contacts ${DIM}(stealth)${RESET}`;

      case 'ecm':
        return result.jamming
          ? `${indicator} ${MAGENTA}ECM active${RESET} (strength ${result.jammingStrength})`
          : `${indicator} ECM: ${DIM}failed${RESET}`;

      case 'eccm':
        return result.protected
          ? `${indicator} ${GREEN}ECCM active${RESET} (protection ${result.protectionStrength})`
          : `${indicator} ECCM: ${DIM}failed${RESET}`;

      case 'target_lock':
        return result.locked
          ? `${indicator} ${RED}LOCKED${RESET} ${result.target} (Boon to attacks)`
          : `${indicator} Lock: ${DIM}failed${RESET}`;

      case 'break_lock':
        return result.broken
          ? `${indicator} ${GREEN}Lock broken!${RESET}`
          : `${indicator} Break lock: ${DIM}failed${RESET}`;

      // Damage control actions
      case 'repair_system':
        return result.repaired
          ? `${indicator} Repaired ${CYAN}${result.system}${RESET}`
          : `${indicator} Repair ${result.system}: ${DIM}failed${RESET}`;

      case 'firefighting':
        return result.extinguished
          ? `${indicator} ${GREEN}Fire extinguished${RESET} at ${result.location}`
          : `${indicator} Fighting fire at ${result.location}...`;

      case 'seal_breach':
        return result.sealed
          ? `${indicator} ${GREEN}Breach sealed${RESET} at ${result.location}`
          : `${indicator} Seal breach: ${DIM}failed${RESET}`;

      case 'emergency_bulkhead':
        return `${indicator} ${YELLOW}Bulkhead sealed:${RESET} ${result.section}`;

      case 'damage_assessment':
        return `${indicator} Damage assessment complete`;

      default:
        return `${indicator} ${action}`;
    }
  }

  /**
   * Render additional details for some actions
   */
  renderActionDetails(role, action, result) {
    // Show detected contacts for scans
    if ((action === 'active_scan' || action === 'passive_scan') && result.detected?.length > 0) {
      for (const contact of result.detected) {
        const detail = contact.detailLevel === 'full' ? contact.name : 'Unknown';
        this.output(`  ${DIM}└─${RESET} ${detail} at ${contact.range}`);
      }
    }

    // Show damage assessment details
    if (action === 'damage_assessment' && result.assessment) {
      const a = result.assessment;
      this.output(`  ${DIM}Hull: ${a.hullPercent}% | Systems: ${a.damagedSystems.length} damaged | Fires: ${a.activeFires} | Breaches: ${a.activeBreaches}${RESET}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DISPLAY HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Format role name for display
   */
  formatRoleName(role) {
    const names = {
      captain: 'Captain',
      pilot: 'Pilot',
      gunner: 'Gunner',
      engineer: 'Engineer',
      sensors: 'Sensors',
      damage_control: 'Damage Ctrl'
    };
    return names[role] || role;
  }

  /**
   * Show available actions for a role
   */
  showRoleActions(role) {
    const engine = this.engines[role];
    if (!engine) {
      this.output(`${RED}No engine for role: ${role}${RESET}`);
      return;
    }

    const style = ROLE_STYLES[role] || { color: WHITE, icon: '•' };
    const actions = engine.getAvailableActions();

    this.output('');
    this.output(`${style.color}${BOLD}${style.icon} ${this.formatRoleName(role)} Actions:${RESET}`);

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const defaultMark = action.isDefault ? `${GREEN}*${RESET}` : ' ';
      this.output(`  ${defaultMark}${i + 1}. ${action.label}`);
      if (this.verbose && action.description) {
        this.output(`      ${DIM}${action.description}${RESET}`);
      }
    }
  }

  /**
   * Show all available actions (for Captain in solo mode)
   */
  showAllActions() {
    const roles = ['pilot', 'gunner', 'engineer', 'sensors', 'damage_control'];

    this.output('');
    this.output(`${YELLOW}${BOLD}⚓ Captain Mode - All Actions Available:${RESET}`);

    for (const role of roles) {
      const engine = this.engines[role];
      if (!engine) continue;

      const style = ROLE_STYLES[role];
      const actions = engine.getAvailableActions();

      this.output('');
      this.output(`${style.color}${style.icon} ${this.formatRoleName(role)}:${RESET}`);

      for (const action of actions) {
        const defaultMark = action.isDefault ? '*' : ' ';
        this.output(`  ${defaultMark} ${action.label}`);
      }
    }
  }

  /**
   * Show ship status summary
   */
  showShipStatus(ship) {
    this.output('');
    this.output(`${CYAN}${BOLD}Ship Status: ${ship.name}${RESET}`);

    // Hull bar
    const hullPct = Math.round(((ship.hull || 0) / (ship.maxHull || 100)) * 100);
    const hullBar = this.progressBar(hullPct);
    this.output(`  Hull: ${hullBar} ${hullPct}%`);

    // Power
    const powerPct = Math.round(((ship.power || 0) / (ship.maxPower || 100)) * 100);
    this.output(`  Power: ${powerPct}%`);

    // Thrust
    const thrustRemaining = ship.thrustRemaining ?? ship.thrust ?? 0;
    const thrustTotal = ship.thrust ?? thrustRemaining;
    this.output(`  Thrust: ${thrustRemaining}/${thrustTotal}`);

    // Status flags
    const flags = [];
    if (ship.evasiveManeuvers) flags.push('Evasive');
    if (ship.weaponsFree) flags.push('Weapons Free');
    if (ship.ecmActive) flags.push('ECM');
    if (ship.eccmActive) flags.push('ECCM');
    if (flags.length > 0) {
      this.output(`  Status: ${flags.join(', ')}`);
    }
  }

  /**
   * ASCII progress bar
   */
  progressBar(percent, width = 10) {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    const color = percent > 60 ? GREEN : percent > 30 ? YELLOW : RED;
    return `${color}[${'█'.repeat(filled)}${'░'.repeat(empty)}]${RESET}`;
  }
}

module.exports = { TUIRoleAdapter, ROLE_STYLES };
