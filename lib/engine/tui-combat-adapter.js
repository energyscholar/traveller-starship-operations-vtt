/**
 * TUI Combat Adapter
 *
 * Subscribes to CombatEngine events and renders ANSI-formatted output.
 * Bridges the pure game engine to terminal display.
 *
 * @module lib/engine/tui-combat-adapter
 */

const { EventTypes } = require('./event-bus');

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

class TUICombatAdapter {
  /**
   * Create adapter
   * @param {CombatEngine} engine - Combat engine to subscribe to
   * @param {Object} options
   * @param {Function} options.output - Output function (default: console.log)
   * @param {boolean} options.verbose - Show detailed modifiers
   * @param {Function} options.isPlayerShip - Function to check if ship is player's
   */
  constructor(engine, options = {}) {
    this.engine = engine;
    this.output = options.output || console.log;
    this.verbose = options.verbose ?? true;
    this.isPlayerShip = options.isPlayerShip || (() => true);
    this.unsubscribe = null;
  }

  /**
   * Start listening to engine events
   */
  connect() {
    this.unsubscribe = this.engine.subscribeMany({
      [EventTypes.ROUND_STARTED]: (e) => this.onRoundStarted(e),
      [EventTypes.PHASE_CHANGED]: (e) => this.onPhaseChanged(e),
      [EventTypes.INITIATIVE_ROLLED]: (e) => this.onInitiativeRolled(e),
      [EventTypes.ATTACK_RESOLVED]: (e) => this.onAttackResolved(e),
      [EventTypes.DAMAGE_APPLIED]: (e) => this.onDamageApplied(e),
      [EventTypes.SHIP_DESTROYED]: (e) => this.onShipDestroyed(e),
      [EventTypes.SYSTEM_DAMAGED]: (e) => this.onSystemDamaged(e),
      [EventTypes.POINT_DEFENSE]: (e) => this.onPointDefense(e),
      [EventTypes.EVASIVE_ACTION]: (e) => this.onEvasiveAction(e),
      [EventTypes.SANDCASTER]: (e) => this.onSandcaster(e),
      [EventTypes.COMBAT_ENDED]: (e) => this.onCombatEnded(e)
    });
  }

  /**
   * Stop listening to events
   */
  disconnect() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EVENT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  onRoundStarted(event) {
    const { round, shipsRemaining } = event.data;
    this.output('');
    this.output(`${BOLD}${CYAN}══════════════════════════════════════${RESET}`);
    this.output(`${BOLD}${CYAN}         COMBAT ROUND ${round}${RESET}`);
    this.output(`${BOLD}${CYAN}══════════════════════════════════════${RESET}`);
    this.output(`${DIM}Ships in combat: ${shipsRemaining}${RESET}`);
  }

  onPhaseChanged(event) {
    const { phase, round } = event.data;
    const phaseName = this.formatPhaseName(phase);
    this.output('');
    this.output(`${YELLOW}─── ${phaseName} Phase ───${RESET}`);
  }

  onInitiativeRolled(event) {
    const { initiatives } = event.data;
    this.output(`${DIM}Initiative order:${RESET}`);
    for (const init of initiatives) {
      const color = this.isPlayerShip({ id: init.shipId }) ? GREEN : RED;
      const breakdown = init.breakdown;
      const details = this.verbose
        ? ` ${DIM}[${breakdown.roll}+${breakdown.pilotSkill}+${breakdown.thrustBonus}${breakdown.tacticsDM ? `+${breakdown.tacticsDM}` : ''}]${RESET}`
        : '';
      this.output(`  ${color}${init.shipName}${RESET}: ${init.total}${details}`);
    }
  }

  onAttackResolved(event) {
    const { hit, attacker, defender, weapon, roll, totalDM, total, damage, modifiers } = event.data;

    const isPlayer = this.isPlayerShip(attacker);
    const color = isPlayer ? GREEN : RED;
    const action = hit ? `${GREEN}HIT${RESET}` : `${DIM}MISS${RESET}`;
    const weaponName = this.formatWeaponName(weapon);

    // Build attack line
    let line = `${color}${attacker.name}${RESET} ${weaponName} → ${action}!`;

    // Add damage if hit
    if (hit && damage > 0) {
      line += ` ${defender.name} ${YELLOW}-${damage} hull${RESET}`;
    } else if (hit && damage === 0) {
      line += ` ${DIM}(absorbed by armor)${RESET}`;
    }

    // Add crunch if verbose
    if (this.verbose) {
      line += ` ${DIM}[${roll.total}+${totalDM}=${total} vs 8]${RESET}`;
    }

    this.output(line);
  }

  onDamageApplied(event) {
    // Usually covered by attack, but can show power drain separately
    const { ship, powerDrain, remainingPower } = event.data;
    if (powerDrain > 0) {
      this.output(`  ${MAGENTA}⚡ ${ship.name} power drain: -${powerDrain} (${remainingPower} remaining)${RESET}`);
    }
  }

  onShipDestroyed(event) {
    const { ship, killedBy } = event.data;
    this.output('');
    this.output(`${RED}${BOLD}💥 ${ship.name} DESTROYED!${RESET}`);
    if (killedBy) {
      this.output(`${DIM}   Killed by ${killedBy.name}${RESET}`);
    }
  }

  onSystemDamaged(event) {
    const { ship, system, hits, disabled } = event.data;
    const sysName = this.formatSystemName(system);

    if (disabled) {
      this.output(`  ${RED}⚠ ${ship.name} ${sysName} DISABLED!${RESET}`);
    } else {
      this.output(`  ${YELLOW}${sysName} damaged (${hits}/3 hits)${RESET}`);
    }
  }

  onPointDefense(event) {
    const { defender, intercepted, pointDefense } = event.data;
    if (!pointDefense) return;

    if (intercepted) {
      this.output(`${CYAN}Point defense intercept!${RESET} ${DIM}[PD: ${pointDefense.total} vs 8]${RESET}`);
    } else {
      this.output(`${DIM}PD miss [${pointDefense.total} vs 8]${RESET}`);
    }
  }

  onEvasiveAction(event) {
    const { ship, enabled, penalty } = event.data;
    if (enabled) {
      this.output(`${CYAN}${ship.name} engaging evasive maneuvers (-${penalty} to hit)${RESET}`);
    }
  }

  onSandcaster(event) {
    const { ship, remaining } = event.data;
    this.output(`${CYAN}${ship.name} activates sandcaster! (${remaining} remaining)${RESET}`);
  }

  onCombatEnded(event) {
    const { winner, reason } = event.data;
    this.output('');
    this.output(`${BOLD}${CYAN}══════════════════════════════════════${RESET}`);

    if (winner === 'player') {
      this.output(`${GREEN}${BOLD}         VICTORY!${RESET}`);
    } else if (winner === 'enemy') {
      this.output(`${RED}${BOLD}         DEFEAT!${RESET}`);
    } else {
      this.output(`${YELLOW}${BOLD}         STALEMATE${RESET}`);
    }

    this.output(`${DIM}${reason}${RESET}`);
    this.output(`${BOLD}${CYAN}══════════════════════════════════════${RESET}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FORMATTERS
  // ─────────────────────────────────────────────────────────────────────────────

  formatPhaseName(phase) {
    const names = {
      initiative: 'Initiative',
      manoeuvre: 'Manoeuvre',
      attack: 'Attack',
      reaction: 'Reaction',
      actions: 'Actions',
      damage: 'Damage Control'
    };
    return names[phase] || phase;
  }

  formatWeaponName(weapon) {
    if (!weapon) return 'weapon';
    return weapon
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace('Pulse ', '')
      .replace('Beam ', '');
  }

  formatSystemName(system) {
    const names = {
      mDrive: 'M-Drive',
      jDrive: 'Jump Drive',
      powerPlant: 'Power Plant',
      sensors: 'Sensors',
      computer: 'Computer',
      fuel: 'Fuel Tanks',
      weapon: 'Weapons'
    };
    return names[system] || system;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MANUAL OUTPUT HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Output fleet status summary
   */
  showFleetStatus(playerFleet, enemyFleet) {
    this.output('');
    this.output(`${GREEN}${BOLD}Player Fleet:${RESET}`);
    for (const ship of playerFleet) {
      if (ship.destroyed) {
        this.output(`  ${DIM}${ship.name} [DESTROYED]${RESET}`);
      } else {
        const hullPct = Math.round((ship.hull / ship.maxHull) * 100);
        const hullBar = this.progressBar(hullPct, 10);
        this.output(`  ${GREEN}${ship.name}${RESET} ${hullBar} ${hullPct}%`);
      }
    }

    this.output(`${RED}${BOLD}Enemy Fleet:${RESET}`);
    for (const ship of enemyFleet) {
      if (ship.destroyed) {
        this.output(`  ${DIM}${ship.name} [DESTROYED]${RESET}`);
      } else {
        const hullPct = Math.round((ship.hull / ship.maxHull) * 100);
        const hullBar = this.progressBar(hullPct, 10);
        this.output(`  ${RED}${ship.name}${RESET} ${hullBar} ${hullPct}%`);
      }
    }
  }

  /**
   * Create ASCII progress bar
   */
  progressBar(percent, width = 10) {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    const color = percent > 60 ? GREEN : percent > 30 ? YELLOW : RED;
    return `${color}[${'█'.repeat(filled)}${'░'.repeat(empty)}]${RESET}`;
  }

  /**
   * Output a narrative line
   */
  narrative(text) {
    this.output(text);
  }
}

module.exports = { TUICombatAdapter };
