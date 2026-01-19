/**
 * Ship configurations for combat demos
 * Each config returns { player, enemy, startRange, description }
 * All bonuses (FC, skills, sensors) are explicitly specified
 */

// Default systems for any ship
// Each system is an object with hits (damage taken) and disabled flag
function createDefaultSystems() {
  return {
    mDrive: { hits: 0, disabled: false },
    jDrive: { hits: 0, disabled: false },
    powerPlant: { hits: 0, disabled: false },
    sensors: { hits: 0, disabled: false },
    computer: { hits: 0, disabled: false },
    lifeSupport: { hits: 0, disabled: false },
    fuel: { hits: 0, disabled: false },
    bridge: { hits: 0, disabled: false }
  };
}

// ============================================================
// DEMO 1: Kimbly (PC Scout) vs Pirate Scout
// ============================================================

// ISS Kimbly - Type S Scout with PC crew
// Source: seed-dorannia.js lines 311-368
function createKimbly() {
  return {
    name: 'Kimbly',
    shipType: 'Type-S Scout',
    // Hull & Defenses
    hull: 40, maxHull: 40,        // 100t = 40 HP
    armour: 4,                     // Crystaliron armour (from seed)
    power: 40, maxPower: 40,       // Power Plant
    // Propulsion
    thrust: 2, thrustUsed: 0,      // Thrust 2
    jump: 2,                       // Jump-2
    // Combat modifiers - all legal bonuses
    fireControl: 1,                // Computer/5bis targeting
    sensorDM: 1,                   // Military sensors (+1 DM)
    sensorGrade: 'military',       // AR-272: Military grade sensors
    // Crew skills (PC crew)
    pilotSkill: 1,                 // Von Sydo (Pilot-1)
    sensorOperator: { name: 'Von Sydo', skill: 2 },  // AR-272: Electronics (Sensors)-2
    captain: { name: 'James', skill_tactics_naval: 3 },  // Tactics bonus for initiative
    // EW state (AR-272)
    ecmActive: false,
    eccmActive: false,
    ewBonus: 0,                    // Set by EW clash at combat start
    // State
    evasive: false,
    sandcasters: 20,               // 1 sandcaster × 20 canisters
    missiles: 12,                  // Standard missile load
    // Ship specs
    tonnage: 100,
    hardpoints: 1,
    turrets: [
      {
        id: 1,
        type: 'triple',
        weapons: ['pulse_laser', 'sandcaster', 'missile_rack'],
        gunner: 'Marina',
        gunnerSkill: 6              // Marina (Gunner-6)
      }
    ],
    // Crew roster for display
    crew: [
      { name: 'James', role: 'Captain', skill: 'Tactics-3' },
      { name: 'Von Sydo', role: 'Pilot/Sensors', skill: 'Pilot-1, Sensors-2' },
      { name: 'Marina', role: 'Gunner', skill: 'Gunner-6' },
      { name: 'Max', role: 'Engineer', skill: 'Mechanic-2' },
      { name: 'Asao', role: 'Damage Control', skill: 'Vacc Suit-2' }
    ]
  };
}

// Pirate Scout - Hostile Type S with lesser crew
function createPirateScout() {
  return {
    name: 'Pirate Scout',
    shipType: 'Type-S Scout',
    // Hull & Defenses (standard Type-S)
    hull: 40, maxHull: 40,        // 100t = 40 HP
    armour: 4,                     // Type-S standard: Armour 4
    power: 40, maxPower: 40,
    // Propulsion
    thrust: 2, thrustUsed: 0,
    jump: 2,
    // Combat modifiers - basic pirate
    fireControl: 0,                // No fire control software
    sensorDM: 0,                   // Civilian sensors
    sensorGrade: 'civilian',       // AR-272: Civilian grade sensors
    // Crew skills (inexperienced pirates)
    pilotSkill: 1,                 // Pirate pilot
    sensorOperator: { name: 'Pirate Tech', skill: 1 },  // AR-272: Electronics (Sensors)-1
    // EW state (AR-272)
    ecmActive: false,
    eccmActive: false,
    ewBonus: 0,
    // State
    evasive: false,
    tacticalAwareness: false,
    sandcasters: 20,
    missiles: 12,
    // Ship specs
    tonnage: 100,
    hardpoints: 1,
    turrets: [
      {
        id: 1,
        type: 'triple',
        weapons: ['pulse_laser', 'sandcaster', 'missile_rack'],
        gunner: 'Pirate Gunner',
        gunnerSkill: 1
      }
    ],
    // Crew roster for display (AR-272)
    crew: [
      { name: 'Pirate Captain', role: 'Captain', skill: 'Tactics-0' },
      { name: 'Pirate Pilot', role: 'Pilot', skill: 'Pilot-1' },
      { name: 'Pirate Tech', role: 'Sensors', skill: 'Sensors-1' },
      { name: 'Pirate Gunner', role: 'Gunner', skill: 'Gunner-1' }
    ]
  };
}

// ============================================================
// DEMO 2: Astral Dawn (Q-Ship) vs Patrol Corvette
// ============================================================

// ISS Astral Dawn (Q-Ship) - 600 tons
// Source: data/ships/v2/amishi.json
function createAstralDawn() {
  return {
    name: 'Astral Dawn',
    shipType: 'Q-Ship',
    hull: 240, maxHull: 240,       // 600t = 240 HP
    armour: 1,                      // Bonded Superdense
    power: 548, maxPower: 548,
    thrust: 3, thrustUsed: 0,
    jump: 3,
    // Combat modifiers
    fireControl: 4,                 // Computer/25 fire control (+4 DM)
    sensorDM: 1,                    // Improved sensors
    pilotSkill: 2,
    captain: { name: 'James', skill_tactics_naval: 3 },
    evasive: false,
    sandcasters: 120,               // 6× sandcasters × 20 canisters
    missiles: 48,                   // 4 missile racks × 12
    nuclearMissiles: 2,             // AR-226.8: Emergency nukes (highly illegal!)
    smartMissiles: 6,               // Smart missiles for tough targets
    tonnage: 600,
    hardpoints: 6,
    // Marina's weapons - she does called shots on Power Plant
    barbettes: [
      { id: 'ion', name: 'Ion Barbette', damage: '3d6×10 pwr', gunner: 'Recruit Yuki', gunnerSkill: 3 },
      { id: 'particle', name: 'Particle Barbette', damage: '6d6 hull', gunner: 'Marina', gunnerSkill: 6, calledShot: true }
    ],
    // All turrets identical for maximum flexibility:
    // - Beam laser: precision fire at any range
    // - Missile rack: long-range alpha strike capability
    // - Sandcaster: point defense vs missiles
    turrets: [
      { id: 1, type: 'triple', weapons: ['beam_laser', 'missile_rack', 'sandcaster'], gunner: 'Gunnery Mate Chen', gunnerSkill: 2 },
      { id: 2, type: 'triple', weapons: ['beam_laser', 'missile_rack', 'sandcaster'], gunner: 'Gunnery Mate Torres', gunnerSkill: 2 },
      { id: 3, type: 'triple', weapons: ['beam_laser', 'missile_rack', 'sandcaster'], gunner: 'Gunnery Mate Kim', gunnerSkill: 2 },
      { id: 4, type: 'triple', weapons: ['beam_laser', 'missile_rack', 'sandcaster'], gunner: 'Gunnery Mate Patel', gunnerSkill: 2 }
    ]
  };
}

// Patrol Corvette (Type-T) - 400 tons
// Source: MONGOOSE-TRAVELLER-RULES-EXTRACT.md
function createPatrolCorvette() {
  return {
    name: 'Patrol Corvette',
    shipType: 'Type-T Corvette',
    hull: 160, maxHull: 160,       // 400t = 160 HP
    armour: 4,
    power: 390, maxPower: 390,
    thrust: 4, thrustUsed: 0,
    jump: 3,
    // Combat modifiers
    fireControl: 1,                 // Fire Control/1
    sensorDM: 1,                    // Military Grade sensors
    pilotSkill: 2,                  // Trained Navy pilot
    tacticalAwareness: false,
    tonnage: 400,
    hardpoints: 4,
    turrets: [
      { id: 1, type: 'triple', weapons: ['pulse_laser', 'pulse_laser', 'pulse_laser'], gunner: 'Navy Gunner', gunnerSkill: 2 },
      { id: 2, type: 'triple', weapons: ['pulse_laser', 'pulse_laser', 'pulse_laser'], gunner: 'Navy Gunner 2', gunnerSkill: 2 },
      { id: 3, type: 'triple', weapons: ['missile_rack', 'missile_rack', 'missile_rack'], gunner: 'Navy Gunner 3', gunnerSkill: 1 },
      { id: 4, type: 'triple', weapons: ['missile_rack', 'missile_rack', 'missile_rack'], gunner: 'Navy Gunner 4', gunnerSkill: 1 }
    ]
  };
}

// ============================================================
// DEMO 3 SHIPS: Q-Ship Fleet vs Destroyer Escort
// ============================================================

// Tlatl Missile Fighter (10t) - alpha strike craft
function createTlatlFighter(id) {
  return {
    id: `tlatl_${id}`,
    name: `Tlatl ${id}`,
    shipType: 'Tlatl Fighter',
    // Hull/Armor
    hull: 4, maxHull: 4,
    armour: 0,                       // Unarmored - speed is defense
    power: 10, maxPower: 10,
    // Propulsion
    thrust: 6, thrustUsed: 0,        // High maneuver
    jump: 0,                         // No jump drive
    // Combat modifiers
    fireControl: 0,
    sensorDM: 0,
    pilotSkill: 2,                   // Trained fighter pilot
    // State
    evasive: false,
    missiles: 6,                     // Small load, one engagement
    // Ship specs
    tonnage: 10,
    hardpoints: 1,
    turrets: [
      {
        id: 1,
        type: 'single',
        weapons: ['missile_rack'],
        gunner: `Pilot ${id}`,       // Pilot doubles as gunner
        gunnerSkill: 1
      }
    ],
    crew: [
      { name: `Pilot ${id}`, role: 'Pilot', skill: 'Pilot-2' }
    ],
    systems: createDefaultSystems()
  };
}

// Armed Fast Pinnace (40t) - escort/pursuit craft
function createArmedPinnace() {
  return {
    id: 'pinnace_1',
    name: 'Razorback',
    shipType: 'Fast Pinnace',
    // Hull/Armor
    hull: 16, maxHull: 16,
    armour: 4,                       // Armored variant
    power: 40, maxPower: 40,
    // Propulsion
    thrust: 5, thrustUsed: 0,
    jump: 0,                         // No jump
    // Combat modifiers
    fireControl: 1,
    sensorDM: 0,
    pilotSkill: 2,
    // State
    evasive: false,
    sandcasters: 10,
    // Ship specs
    tonnage: 40,
    hardpoints: 1,
    turrets: [
      {
        id: 1,
        type: 'double',
        weapons: ['pulse_laser', 'sandcaster'],
        gunner: 'Pinnace Gunner',
        gunnerSkill: 2
      }
    ],
    crew: [
      { name: 'Lt. Vance', role: 'Pilot', skill: 'Pilot-2' },
      { name: 'Cpl. Torres', role: 'Gunner', skill: 'Gunner-2' }
    ],
    systems: createDefaultSystems()
  };
}

// Mercenary Cruiser (Type-C, 800t) - well-known troop transport
// Source: MONGOOSE-TRAVELLER-RULES-EXTRACT.md
function createMercenaryCruiser() {
  return {
    id: 'merc_cruiser_1',
    name: 'Broadsword',
    shipType: 'Mercenary Cruiser',
    // Hull/Armor - 800t sphere, Armour 4, 320 HP
    hull: 320, maxHull: 320,
    armour: 4,
    power: 650, maxPower: 650,      // Per rules extract
    // Propulsion - Thrust 3, Jump 3
    thrust: 3, thrustUsed: 0,
    jump: 3,
    // Combat modifiers - Fire Control/1, Military sensors
    fireControl: 1,
    sensorDM: 1,                    // Military Grade sensors
    pilotSkill: 2,
    captain: { name: 'Capt. Hartigan', skill_tactics_naval: 2 },
    // State
    evasive: false,
    sandcasters: 20,
    missiles: 24,
    // Ship specs
    tonnage: 800,
    hardpoints: 8,
    turrets: [
      { id: 1, type: 'triple', weapons: ['pulse_laser', 'pulse_laser', 'pulse_laser'], gunner: 'Gunnery 1', gunnerSkill: 2 },
      { id: 2, type: 'triple', weapons: ['pulse_laser', 'pulse_laser', 'pulse_laser'], gunner: 'Gunnery 2', gunnerSkill: 2 },
      { id: 3, type: 'triple', weapons: ['missile_rack', 'sandcaster', 'sandcaster'], gunner: 'Gunnery 3', gunnerSkill: 1 },
      { id: 4, type: 'triple', weapons: ['missile_rack', 'sandcaster', 'sandcaster'], gunner: 'Gunnery 4', gunnerSkill: 1 },
      { id: 5, type: 'triple', weapons: ['beam_laser', 'beam_laser', 'beam_laser'], gunner: 'Gunnery 5', gunnerSkill: 2 },
      { id: 6, type: 'triple', weapons: ['beam_laser', 'beam_laser', 'beam_laser'], gunner: 'Gunnery 6', gunnerSkill: 2 },
      { id: 7, type: 'triple', weapons: ['particle_beam', 'particle_beam', 'particle_beam'], gunner: 'Gunnery 7', gunnerSkill: 2 },
      { id: 8, type: 'triple', weapons: ['particle_beam', 'particle_beam', 'particle_beam'], gunner: 'Gunnery 8', gunnerSkill: 2 }
    ],
    crew: [
      { name: 'Capt. Hartigan', role: 'Captain', skill: 'Tactics-2' },
      { name: 'Lt. Chen', role: 'Pilot', skill: 'Pilot-2' },
      { name: 'Chief Martinez', role: 'Engineer', skill: 'Engineer-2' },
      { name: 'Sgt. Kowalski', role: 'Marine Commander', skill: 'Leadership-2' }
    ],
    marines: 25,  // Combat platoon
    systems: createDefaultSystems()
  };
}

// Destroyer Escort (1000t) - heavy combatant (kept for reference)
function createDestroyerEscort() {
  return {
    id: 'destroyer_1',
    name: 'INS Vigilant',
    shipType: 'Destroyer Escort',
    // Hull/Armor - tough warship
    hull: 400, maxHull: 400,
    armour: 8,                       // Military armor
    power: 600, maxPower: 600,
    // Propulsion
    thrust: 4, thrustUsed: 0,
    jump: 2,
    // Combat modifiers - well equipped
    fireControl: 2,
    sensorDM: 2,
    pilotSkill: 2,
    captain: { name: 'Cmdr. Reyes', skill_tactics_naval: 2 },
    // State
    evasive: false,
    sandcasters: 40,
    missiles: 48,
    // Ship specs
    tonnage: 1000,
    hardpoints: 10,
    turrets: [
      { id: 1, type: 'triple', weapons: ['beam_laser', 'beam_laser', 'beam_laser'], gunner: 'Gunnery 1', gunnerSkill: 2 },
      { id: 2, type: 'triple', weapons: ['beam_laser', 'beam_laser', 'beam_laser'], gunner: 'Gunnery 2', gunnerSkill: 2 },
      { id: 3, type: 'triple', weapons: ['missile_rack', 'missile_rack', 'missile_rack'], gunner: 'Gunnery 3', gunnerSkill: 2 },
      { id: 4, type: 'triple', weapons: ['missile_rack', 'missile_rack', 'missile_rack'], gunner: 'Gunnery 4', gunnerSkill: 2 },
      { id: 5, type: 'triple', weapons: ['sandcaster', 'sandcaster', 'sandcaster'], gunner: 'Gunnery 5', gunnerSkill: 1 }
    ],
    crew: [
      { name: 'Cmdr. Reyes', role: 'Captain', skill: 'Tactics-2' },
      { name: 'Lt. Okonkwo', role: 'Pilot', skill: 'Pilot-2' },
      { name: 'Chief Vasquez', role: 'Engineer', skill: 'Engineer-3' }
    ],
    systems: createDefaultSystems()
  };
}

// ============================================================
// DEMO 5 SHIPS: Q-Ship Fleet vs Pirate Fleet
// ============================================================

// Pirate Corsair (400t) - well-armed raider
// Similar to Patrol Corvette but with pirate crew
function createPirateCorsair(id = 1) {
  return {
    id: `corsair_${id}`,
    name: `Black ${['Widow', 'Fang', 'Serpent', 'Claw'][id - 1] || 'Raider'}`,
    shipType: 'Pirate Corsair',
    // Hull/Armor - converted trader with added armor
    hull: 160, maxHull: 160,        // 400t = 160 HP
    armour: 4,
    power: 300, maxPower: 300,
    // Propulsion - fast for pursuit
    thrust: 4, thrustUsed: 0,
    jump: 2,
    // Combat modifiers - experienced pirates
    fireControl: 1,
    sensorDM: 0,                    // Civilian sensors
    pilotSkill: 4,                  // Skill-3 + DEX+1 = +4
    captain: { name: `Capt. ${['Vex', 'Kira', 'Jago', 'Renn'][id - 1] || 'Unknown'}`, skill_tactics_naval: 1 },
    // State
    evasive: false,
    sandcasters: 20,
    missiles: 24,
    nuclearMissiles: id === 1 ? 1 : 0,  // AR-226.8: Lead corsair has 1 desperate nuke
    // Ship specs
    tonnage: 400,
    hardpoints: 4,
    turrets: [
      { id: 1, type: 'triple', weapons: ['pulse_laser', 'pulse_laser', 'pulse_laser'], gunner: 'Pirate Gunner 1', gunnerSkill: 3 },  // Skill-2, DEX+1
      { id: 2, type: 'triple', weapons: ['pulse_laser', 'pulse_laser', 'pulse_laser'], gunner: 'Pirate Gunner 2', gunnerSkill: 3 },
      { id: 3, type: 'triple', weapons: ['missile_rack', 'missile_rack', 'sandcaster'], gunner: 'Pirate Gunner 3', gunnerSkill: 3 },
      { id: 4, type: 'triple', weapons: ['missile_rack', 'missile_rack', 'sandcaster'], gunner: 'Pirate Gunner 4', gunnerSkill: 3 }
    ],
    crew: [
      { name: 'Pirate Captain', role: 'Captain', skill: 'Tactics-1' },
      { name: 'Pirate Pilot', role: 'Pilot', skill: 'Pilot-3, DEX+1' },
      { name: 'Pirate Engineer', role: 'Engineer', skill: 'Engineer-1' }
    ],
    marines: 8,  // Boarding party
    systems: createDefaultSystems()
  };
}

// Pirate Boarding Shuttle (30t) - armed small craft
function createPirateShuttle(id = 1) {
  return {
    id: `shuttle_${id}`,
    name: `Leech ${id}`,
    shipType: 'Boarding Shuttle',
    // Hull/Armor - small, expendable
    hull: 12, maxHull: 12,
    armour: 2,
    power: 30, maxPower: 30,
    // Propulsion - fast approach
    thrust: 6, thrustUsed: 0,
    jump: 0,                        // No jump drive
    // Combat modifiers - basic
    fireControl: 0,
    sensorDM: 0,
    pilotSkill: 1,
    // State
    evasive: false,
    // Ship specs
    tonnage: 30,
    hardpoints: 1,
    turrets: [
      { id: 1, type: 'single', weapons: ['pulse_laser'], gunner: 'Shuttle Gunner', gunnerSkill: 1 }
    ],
    crew: [
      { name: `Shuttle Pilot ${id}`, role: 'Pilot', skill: 'Pilot-1' }
    ],
    marines: 6,  // Boarding marines
    systems: createDefaultSystems()
  };
}

// Pirate Tug Tender (1000t) - auxiliary support vessel
// Lightly armed but valuable prize - carries fuel and supplies
function createPirateTugTender() {
  return {
    id: 'tug_tender_1',
    name: 'Scavenger',
    shipType: 'Tug Tender',
    // Hull/Armor - big but fragile
    hull: 400, maxHull: 400,        // 1000t = 400 HP
    armour: 2,                      // Minimal armor
    power: 400, maxPower: 400,
    // Propulsion - slow
    thrust: 2, thrustUsed: 0,
    jump: 1,
    // Combat modifiers - skeleton crew
    fireControl: 0,
    sensorDM: 0,
    pilotSkill: 1,
    // State
    evasive: false,
    sandcasters: 10,
    // Ship specs
    tonnage: 1000,
    hardpoints: 2,
    turrets: [
      { id: 1, type: 'double', weapons: ['pulse_laser', 'sandcaster'], gunner: 'Tug Gunner 1', gunnerSkill: 1 },
      { id: 2, type: 'double', weapons: ['pulse_laser', 'sandcaster'], gunner: 'Tug Gunner 2', gunnerSkill: 1 }
    ],
    crew: [
      { name: 'Tug Captain', role: 'Captain', skill: 'Tactics-0' },
      { name: 'Tug Pilot', role: 'Pilot', skill: 'Pilot-1' },
      { name: 'Tug Engineer', role: 'Engineer', skill: 'Engineer-2' }
    ],
    cargo: 400,  // Large cargo capacity
    fuel: 200,   // Fleet refueling capability
    hangarBays: 4,  // Can carry 4 smallcraft
    systems: createDefaultSystems()
  };
}

// ============================================================
// DEMO 5 SHIPS: Blood Profit Pack (Vargr Corsairs)
// Source: blood-profit-pack.md
// ============================================================

// Kforr Dzarrgh ("Blood Fang") - 400t Corsair (Flagship)
function createBloodProfitFlagship() {
  return {
    id: 'blood_flagship',
    name: 'Kforr Dzarrgh',
    shipType: 'Corsair',
    // Hull/Armor - 400t corsair
    hull: 160, maxHull: 160,
    armour: 6,
    power: 160, maxPower: 160,
    // Propulsion
    thrust: 4, thrustUsed: 0,
    jump: 2,
    // Combat modifiers
    fireControl: 1,
    sensorDM: 1,
    sensorGrade: 'military',
    pilotSkill: 2,
    captain: { name: 'Kfourrz', skill_tactics_naval: 2 },
    // State
    evasive: false,
    // Ship specs
    tonnage: 400,
    hardpoints: 4,
    turrets: [
      { id: 1, type: 'barbette', weapons: ['particle_accelerator'], gunner: 'Blood Gunner 1', gunnerSkill: 3 }
    ],
    crew: [
      { name: 'Kfourrz', role: 'Captain', skill: 'Tactics-2' },
      { name: 'Vargr Pilot', role: 'Pilot', skill: 'Pilot-2' },
      { name: 'Vargr Gunner', role: 'Gunner', skill: 'Gunner-3' }
    ],
    crewCount: 20,
    systems: createDefaultSystems()
  };
}

// Gvurrdon's Claw - 200t Armed Trader
function createBloodProfitTrader() {
  return {
    id: 'blood_trader',
    name: "Gvurrdon's Claw",
    shipType: 'Armed Trader',
    // Hull/Armor
    hull: 80, maxHull: 80,
    armour: 4,
    power: 80, maxPower: 80,
    // Propulsion
    thrust: 2, thrustUsed: 0,
    jump: 1,
    // Combat modifiers
    fireControl: 0,
    sensorDM: 0,
    sensorGrade: 'civilian',
    pilotSkill: 1,
    captain: { name: 'Aekhs', skill_tactics_naval: 1 },
    // State
    evasive: false,
    sandcasters: 20,
    missiles: 12,
    // Ship specs
    tonnage: 200,
    hardpoints: 2,
    turrets: [
      { id: 1, type: 'triple', weapons: ['beam_laser', 'beam_laser', 'sandcaster'], gunner: 'Trader Gunner 1', gunnerSkill: 2 },
      { id: 2, type: 'triple', weapons: ['beam_laser', 'missile_rack', 'sandcaster'], gunner: 'Trader Gunner 2', gunnerSkill: 2 }
    ],
    crew: [
      { name: 'Aekhs', role: 'Captain', skill: 'Tactics-1' },
      { name: 'Trader Pilot', role: 'Pilot', skill: 'Pilot-1' }
    ],
    crewCount: 10,
    systems: createDefaultSystems()
  };
}

// Swift Kill - 100t SDB (Attack Boat)
function createBloodProfitSDB() {
  return {
    id: 'blood_sdb',
    name: 'Swift Kill',
    shipType: 'SDB',
    // Hull/Armor - armored attack boat
    hull: 40, maxHull: 40,
    armour: 6,
    power: 40, maxPower: 40,
    // Propulsion - fast but no jump
    thrust: 6, thrustUsed: 0,
    jump: 0,
    // Combat modifiers
    fireControl: 1,
    sensorDM: 1,
    sensorGrade: 'military',
    pilotSkill: 2,
    captain: { name: 'Rroungz', skill_tactics_naval: 1 },
    // State
    evasive: false,
    // Ship specs
    tonnage: 100,
    hardpoints: 1,
    turrets: [
      { id: 1, type: 'barbette', weapons: ['plasma_gun'], gunner: 'SDB Gunner', gunnerSkill: 3 }
    ],
    crew: [
      { name: 'Rroungz', role: 'Captain', skill: 'Tactics-1' },
      { name: 'SDB Pilot', role: 'Pilot', skill: 'Pilot-2' }
    ],
    crewCount: 5,
    systems: createDefaultSystems()
  };
}

// Ghost Runner - 100t Scout
function createBloodProfitScout() {
  return {
    id: 'blood_scout',
    name: 'Ghost Runner',
    shipType: 'Scout',
    // Hull/Armor
    hull: 40, maxHull: 40,
    armour: 4,
    power: 40, maxPower: 40,
    // Propulsion
    thrust: 2, thrustUsed: 0,
    jump: 2,
    // Combat modifiers
    fireControl: 0,
    sensorDM: 1,
    sensorGrade: 'military',
    pilotSkill: 2,
    captain: { name: 'Llokh', skill_tactics_naval: 0 },
    // State
    evasive: false,
    sandcasters: 10,
    // Ship specs
    tonnage: 100,
    hardpoints: 1,
    turrets: [
      { id: 1, type: 'double', weapons: ['pulse_laser', 'sandcaster'], gunner: 'Scout Gunner', gunnerSkill: 1 }
    ],
    crew: [
      { name: 'Llokh', role: 'Captain', skill: 'Tactics-0' },
      { name: 'Scout Pilot', role: 'Pilot', skill: 'Pilot-2' }
    ],
    crewCount: 4,
    systems: createDefaultSystems()
  };
}

// Uthka Gzae ("Prize Taker") - 600t Jump Tug
function createBloodProfitTug() {
  return {
    id: 'blood_tug',
    name: 'Uthka Gzae',
    shipType: 'Jump Tug',
    // Hull/Armor - big but fragile
    hull: 240, maxHull: 240,
    armour: 2,
    power: 240, maxPower: 240,
    // Propulsion - slow but has jump
    thrust: 1, thrustUsed: 0,
    jump: 2,
    // Combat modifiers
    fireControl: 0,
    sensorDM: 0,
    sensorGrade: 'civilian',
    pilotSkill: 1,
    captain: { name: 'Dzang', skill_tactics_naval: 0 },
    // State
    evasive: false,
    // Ship specs
    tonnage: 600,
    hardpoints: 1,
    turrets: [
      { id: 1, type: 'single', weapons: ['pulse_laser'], gunner: 'Tug Gunner', gunnerSkill: 1 }
    ],
    crew: [
      { name: 'Dzang', role: 'Captain', skill: 'Tactics-0' },
      { name: 'Tug Pilot', role: 'Pilot', skill: 'Pilot-1' }
    ],
    crewCount: 8,
    // Special: Should flee immediately when threatened
    fleeThreshold: 0.9,
    systems: createDefaultSystems()
  };
}

// Blood Profit Fleet - all 5 ships
const BLOOD_PROFIT_FLEET = [
  createBloodProfitFlagship,
  createBloodProfitTrader,
  createBloodProfitSDB,
  createBloodProfitScout,
  createBloodProfitTug
];

// ============================================================
// DEMO CONFIGURATIONS
// ============================================================

const DEMO_CONFIGS = {
  // Demo 1: Scout vs Scout - smoke test with PCs
  // Start at Long range to demonstrate missile fire and point defense
  demo1: {
    description: 'Kimbly vs Pirate Scout (Smoke Test)',
    startRange: 'Long',
    player: createKimbly(),
    enemy: createPirateScout()
  },

  // Demo 2: Q-Ship vs Patrol Corvette - full featured
  demo2: {
    description: 'Astral Dawn vs Patrol Corvette',
    startRange: 'Close',
    player: createAstralDawn(),
    enemy: createPatrolCorvette()
  },

  // Demo 3: Q-Ship Fleet vs Destroyer Escort
  // Fleet combat: 8 player ships vs 1 heavy warship
  // Destroyer has 400 HP + Armor 8 - requires coordinated attack
  demo3: {
    description: 'Q-Ship Fleet vs Destroyer Escort',
    startRange: 'Long',  // Long range for evasive fighter tactics (M-6 = -6 to hit)
    // Player fleet: Q-Ship + 6 fighters + 1 pinnace
    playerFleet: [
      createAstralDawn(),
      createTlatlFighter(1),
      createTlatlFighter(2),
      createTlatlFighter(3),
      createTlatlFighter(4),
      createTlatlFighter(5),
      createTlatlFighter(6),
      createArmedPinnace()
    ],
    // Enemy: Destroyer Escort (1000t, 400 HP, Armor 8)
    enemyFleet: [
      createDestroyerEscort()
    ],
    // Legacy single-ship format for compatibility
    player: createAstralDawn(),
    enemy: createDestroyerEscort()
  },

  // Demo 4: Q-Ship Fleet vs Pirate Fleet
  // Fleet vs fleet combat - ambush scenario
  // Pirates thought they were attacking a merchant!
  demo4: {
    description: 'Q-Ship Fleet vs Pirate Fleet',
    startRange: 'Very Long',  // Favors fleets with missiles
    // Player fleet: Q-Ship + 6 fighters + 1 pinnace
    playerFleet: [
      createAstralDawn(),
      createTlatlFighter(1),
      createTlatlFighter(2),
      createTlatlFighter(3),
      createTlatlFighter(4),
      createTlatlFighter(5),
      createTlatlFighter(6),
      createArmedPinnace()
    ],
    // Pirate fleet: 2 corsairs + 2 shuttles + tug tender
    // Pirates expected easy prey - surprised by Q-Ship reveal!
    enemyFleet: [
      createPirateCorsair(1),       // Black Widow - lead corsair
      createPirateCorsair(2),       // Black Fang - second corsair
      createPirateShuttle(1),       // Leech 1 - boarding shuttle
      createPirateShuttle(2),       // Leech 2 - boarding shuttle
      createPirateTugTender()       // Scavenger - valuable prize
    ],
    // Legacy single-ship format for compatibility
    player: createAstralDawn(),
    enemy: createPirateCorsair(1)
  },

  // Demo 5: Amishi Fleet vs Blood Profit Pack
  // Q-Ship fleet ambushes Vargr corsairs!
  demo5: {
    description: 'Amishi Fleet vs Blood Profit Pack',
    startRange: 'Long',
    // Player fleet: Q-Ship + 6 fighters
    playerFleet: [
      createAstralDawn(),
      createTlatlFighter(1),
      createTlatlFighter(2),
      createTlatlFighter(3),
      createTlatlFighter(4),
      createTlatlFighter(5),
      createTlatlFighter(6)
    ],
    // Blood Profit Pack: 5 ships
    enemyFleet: [
      createBloodProfitFlagship(),
      createBloodProfitTrader(),
      createBloodProfitSDB(),
      createBloodProfitScout(),
      createBloodProfitTug()
    ],
    // Legacy single-ship format for compatibility
    player: createAstralDawn(),
    enemy: createBloodProfitFlagship()
  }
};

module.exports = {
  createDefaultSystems,
  createKimbly,
  createPirateScout,
  createAstralDawn,
  createPatrolCorvette,
  createTlatlFighter,
  createArmedPinnace,
  createMercenaryCruiser,
  createDestroyerEscort,
  createPirateCorsair,
  createPirateShuttle,
  createPirateTugTender,
  createBloodProfitFlagship,
  createBloodProfitTrader,
  createBloodProfitSDB,
  createBloodProfitScout,
  createBloodProfitTug,
  BLOOD_PROFIT_FLEET,
  DEMO_CONFIGS
};
