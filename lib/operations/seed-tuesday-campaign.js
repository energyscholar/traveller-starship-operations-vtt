/**
 * AR-300.2: Seed Tuesday Campaign
 *
 * Creates the persistent Tuesday "Travelling the Spinward Marches" campaign.
 * Auto-seeded on server start if campaign doesn't exist.
 *
 * Campaign: Travelling the Spinward Marches
 * Ship: Amishi (Q-Ship/Auxiliary Carrier)
 * GM: Bruce
 * Players: James, Von Sydo, Max, Marina, Kelani
 */

const { db, generateId } = require('./database');

// Fixed campaign ID for deterministic access
const TUESDAY_CAMPAIGN_ID = '281925de-cbd8-40fe-a135-e0bf8775110f';

// Campaign data
const CAMPAIGN = {
  id: TUESDAY_CAMPAIGN_ID,
  name: 'Travelling the Spinward Marches',
  gm_name: 'Bruce',
  current_date: '310-1115',
  current_system: 'Flammarion',
  current_sector: 'Spinward Marches',
  current_hex: '0930',
  campaign_type: null  // NOT solo_demo - this is a real campaign
};

// Ship: Amishi (Q-Ship/Auxiliary Carrier)
const SHIP = {
  id: '688adde7-155b-4ed4-9c96-fd7252ebc4b4',
  name: 'Amishi',
  template_id: 'amishi',
  ship_data: {
    id: 'amishi',
    name: 'Amishi',
    type: 'Q-Ship/Auxiliary Carrier',
    className: 'Trojan Horse (Type-R Conversion)',
    techLevel: 13,
    tonnage: 600,
    hull: { hullPoints: 240, configuration: 'streamlined' },
    armour: { rating: 1, type: 'Bonded Superdense' },
    thrust: 3,
    jump: 3,
    fuel: { capacity: 125, current: 50, jumpRangeInternal: 2 },
    crew: {
      pilot: 3, astrogator: 1, engineer: 2, gunner: 1,
      sensors: 1, medic: 1, marines: 6, fighterPilots: 6
    },
    weapons: [
      { id: 'turret_1', type: 'sandcaster', name: 'Sandcaster Battery 1', damage: 'defense', mount: 'triple_turret_popup', slot: 1, ammo: 60, ammo_current: 60, ammo_max: 60, range: 'Close', operator: 'AI Gunner' },
      { id: 'turret_2', type: 'sandcaster', name: 'Sandcaster Battery 2', damage: 'defense', mount: 'triple_turret_popup', slot: 2, ammo: 60, ammo_current: 60, ammo_max: 60, range: 'Close', operator: 'AI Gunner' },
      { id: 'turret_3', type: 'beam_laser', name: 'Strike Turret 3', damage: '1d6', mount: 'triple_turret_popup', slot: 3, range: 'Medium', operator: 'AI Gunner' },
      { id: 'turret_3_missiles', type: 'missile_launcher', name: 'Strike Turret 3 Missiles', damage: '4d6', mount: 'triple_turret_popup', slot: 3, ammo: 24, ammo_current: 24, ammo_max: 24, range: 'Long', operator: 'AI Gunner' },
      { id: 'turret_4', type: 'beam_laser', name: 'Strike Turret 4', damage: '1d6', mount: 'triple_turret_popup', slot: 4, range: 'Medium', operator: 'AI Gunner' },
      { id: 'turret_4_missiles', type: 'missile_launcher', name: 'Strike Turret 4 Missiles', damage: '4d6', mount: 'triple_turret_popup', slot: 4, ammo: 24, ammo_current: 24, ammo_max: 24, range: 'Long', operator: 'AI Gunner' },
      { id: 'barbette_ion', type: 'ion_cannon', name: 'High Yield Ion Barbette', damage: 'ion+1d', mount: 'barbette', slot: 5, range: 'Medium', operator: 'Marina (Gunner-6)', upgrades: ['high_yield'], notes: 'Prize-taking weapon - High Yield mod' },
      { id: 'barbette_particle', type: 'particle_beam', name: 'Particle Barbette', damage: '6d6+crew', mount: 'barbette', slot: 6, range: 'Very Long', operator: 'Marina (Gunner-6)', notes: 'Ship-killer' }
    ],
    sensors: 'advanced',
    computer: 'Computer/25',
    software: { jumpControl: 3, fireControl: 4, library: true, manoeuvre: 0, evade: 0, autoRepair: 0, intellect: false, bandwidthUsed: 7, bandwidthAvailable: 25 },
    fuelScoops: true,
    fuelProcessor: true,
    fuelProcessorRate: 200,
    specialFeatures: {
      qShipDisguise: true, popUpTurrets: true, jumpNet: true, aiGunners: 5,
      engineeringDroid: true, stewardDroid: true, collapsibleTanks: 240,
      breachingTube: true, armoury: true, medicalBay: true, workshop: true
    },
    smallCraft: [
      { id: 'fighter_squadron', type: 'light_fighter', quantity: 6, tonnageEach: 10, location: 'internal' },
      { id: 'launch', type: 'armed_launch', quantity: 1, tonnage: 24, location: 'internal' },
      { id: 'pinnace', type: 'armored_pinnace', quantity: 1, tonnage: 40, location: 'external', notes: 'Pirate salvage, carries G-carrier and 5th fuel bladder' }
    ],
    drones: { probe: 5, repair: 5, mining: 10 }
  },
  current_state: {
    alertStatus: 'NORMAL',
    hullPoints: 240,
    fuel: 50,
    fuelBreakdown: { refined: 20, unrefined: 30, processed: 0 },
    power: 100,
    systemHex: '0930',
    locationId: 'loc-dock-highport',
    locationName: 'Flammarion Highport',
    positionVerified: true,
    systems: {
      'Jump Drive': { status: 'operational', health: 100 },
      'Maneuver Drive': { status: 'operational', health: 100 },
      'Power Plant': { status: 'operational', health: 100 },
      'Life Support': { status: 'operational', health: 100 },
      'Sensors': { status: 'operational', health: 100 },
      'Fire Control': { status: 'operational', health: 100 },
      'Comms Array': { status: 'operational', health: 100 },
      'Computer': { status: 'operational', health: 100 },
      'Turret 1 (Sandcasters)': { status: 'operational', health: 100 },
      'Turret 2 (Sandcasters)': { status: 'operational', health: 100 },
      'Turret 3 (Strike)': { status: 'operational', health: 100 },
      'Turret 4 (Strike)': { status: 'operational', health: 100 },
      'High Yield Ion Barbette': { status: 'operational', health: 100 },
      'Particle Barbette': { status: 'operational', health: 100 },
      'Medical Bay': { status: 'operational', health: 100 },
      'Workshop': { status: 'operational', health: 100 },
      'Fuel Processor': { status: 'operational', health: 100 },
      'Fighter Hangar': { status: 'operational', health: 100 },
      'Breaching Tube': { status: 'operational', health: 100 },
      'AI Gunner Network': { status: 'degraded', health: 75, issue: 'Gunner #3 reporting intermittent targeting lag - needs recalibration' },
      'Engineering Droid': { status: 'operational', health: 100 },
      'Steward Droid': { status: 'operational', health: 100 }
    },
    cargo: {
      capacity: 79, used: 55,
      manifest: [
        { item: 'Collapsible Fuel Bladders (x4)', tons: 20, value: 40000 },
        { item: 'Munitions Reserve', tons: 15, value: 75000 },
        { item: 'Spare Parts', tons: 10, value: 50000 },
        { item: 'Crew Supplies', tons: 10, value: 5000 }
      ]
    },
    fuelBladders: {
      shipBladders: 4, pinnaceBladder: 1, capacityEach: 50, deployed: 0,
      notes: '5th bladder stored in pinnace with quick-transfer plumbing'
    }
  }
};

// Player slots
const PLAYERS = [
  {
    id: '29b68852-e041-431d-a633-22fa70c16436',
    slot_name: 'James',
    character_name: 'James',
    role: 'captain',
    character_data: {
      name: 'James',
      skills: { tactics_naval: 3, leadership: 2 },
      notes: 'SECRET: Imperial Admiral, Naval Intel, Darrian (TL16)'
    }
  },
  {
    id: 'bd71ae12-368d-4995-a219-ea1e721f2e29',
    slot_name: 'Von Sydo',
    character_name: 'Von Sydo',
    role: 'sensor_operator',
    character_data: {
      name: 'Von Sydo',
      skills: { sensors: 2, gunner: 1, pilot: 1 },
      notes: 'SECRET: Illegal psion (teleport/telekinesis). Pet: Kimbly (Tenser Wolf)'
    }
  },
  {
    id: '42907ac0-9b3a-47d4-b1e1-d9871a26009f',
    slot_name: 'Max',
    character_name: 'Max',
    role: 'engineer',
    character_data: {
      name: 'Max',
      skills: { electronics: 2, mechanic: 2, medic: 1 },
      notes: 'Mad scientist, has salvaged chamax tech'
    }
  },
  {
    id: 'e45ad62f-2e86-4185-ba48-0fd24f17b583',
    slot_name: 'Marina',
    character_name: 'Marina',
    role: 'gunner',
    character_data: {
      name: 'Marina',
      skills: { diplomat: 3, deception: 2, gunner: 6 },
      notes: 'Expert gunner, social specialist. Operates barbettes on Amishi.'
    }
  },
  {
    id: '0fc2dfae-85d7-45fd-800c-72cddfa3b2be',
    slot_name: 'Kelani',
    character_name: 'Kelani',
    role: 'pilot',
    character_data: {
      name: 'Kelani',
      skills: { pilot: 3, astrogation: 2 },
      notes: 'Primary pilot and astrogator'
    }
  }
];

/**
 * Check if Tuesday campaign already exists with correct ID
 * If campaign exists with same name but wrong ID (from tests), delete it first
 */
function campaignExists() {
  // Check by fixed ID
  const byId = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(TUESDAY_CAMPAIGN_ID);
  if (byId) return true;

  // Check if campaign exists with same name but wrong ID (e.g., from test runs)
  const byName = db.prepare('SELECT id FROM campaigns WHERE name = ?').get(CAMPAIGN.name);
  if (byName && byName.id !== TUESDAY_CAMPAIGN_ID) {
    // Delete the wrongly-IDed campaign so we can create with correct ID
    console.log(`[SeedTuesday] Found campaign with wrong ID (${byName.id}), removing to recreate with correct ID`);
    db.prepare('DELETE FROM mail WHERE campaign_id = ?').run(byName.id);
    db.prepare('DELETE FROM npc_crew WHERE ship_id IN (SELECT id FROM ships WHERE campaign_id = ?)').run(byName.id);
    db.prepare('DELETE FROM ships WHERE campaign_id = ?').run(byName.id);
    db.prepare('DELETE FROM player_accounts WHERE campaign_id = ?').run(byName.id);
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(byName.id);
    return false;  // Proceed with seeding
  }

  return false;
}

/**
 * Delete existing Tuesday campaign (for reset)
 */
function deleteExisting() {
  console.log('[SeedTuesday] Deleting existing Tuesday campaign...');
  db.prepare('DELETE FROM mail WHERE campaign_id = ?').run(TUESDAY_CAMPAIGN_ID);
  db.prepare('DELETE FROM npc_crew WHERE ship_id IN (SELECT id FROM ships WHERE campaign_id = ?)').run(TUESDAY_CAMPAIGN_ID);
  db.prepare('DELETE FROM ships WHERE campaign_id = ?').run(TUESDAY_CAMPAIGN_ID);
  db.prepare('DELETE FROM player_accounts WHERE campaign_id = ?').run(TUESDAY_CAMPAIGN_ID);
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(TUESDAY_CAMPAIGN_ID);
  console.log('[SeedTuesday] Existing campaign deleted');
}

/**
 * Seed the Tuesday campaign
 */
function seedTuesdayCampaign(forceReset = false) {
  console.log('[SeedTuesday] Starting Tuesday campaign seed...');

  if (campaignExists()) {
    if (forceReset) {
      deleteExisting();
    } else {
      console.log('[SeedTuesday] Tuesday campaign already exists, skipping');
      return { campaignId: TUESDAY_CAMPAIGN_ID, alreadyExists: true };
    }
  }

  // Create campaign
  console.log('[SeedTuesday] Creating campaign:', CAMPAIGN.name);
  db.prepare(`
    INSERT INTO campaigns (id, name, gm_name, current_date, current_system, current_sector, current_hex, campaign_type, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    CAMPAIGN.id, CAMPAIGN.name, CAMPAIGN.gm_name, CAMPAIGN.current_date,
    CAMPAIGN.current_system, CAMPAIGN.current_sector, CAMPAIGN.current_hex, CAMPAIGN.campaign_type
  );

  // Create ship
  console.log('[SeedTuesday] Creating ship:', SHIP.name);
  db.prepare(`
    INSERT INTO ships (id, campaign_id, name, template_id, ship_data, visible_to_players, is_party_ship, current_state, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, 1, ?, datetime('now'), datetime('now'))
  `).run(
    SHIP.id, CAMPAIGN.id, SHIP.name, SHIP.template_id,
    JSON.stringify(SHIP.ship_data), JSON.stringify(SHIP.current_state)
  );

  // Create player slots
  for (const player of PLAYERS) {
    console.log('[SeedTuesday] Creating player slot:', player.slot_name);
    db.prepare(`
      INSERT INTO player_accounts (id, campaign_id, slot_name, role, character_name, character_data, ship_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      player.id, CAMPAIGN.id, player.slot_name, player.role,
      player.character_name, JSON.stringify(player.character_data), SHIP.id
    );
  }

  console.log('[SeedTuesday] ✓ Tuesday campaign created successfully');
  console.log('[SeedTuesday] Campaign ID:', CAMPAIGN.id);
  console.log('[SeedTuesday] Ship:', SHIP.name);
  console.log('[SeedTuesday] Players:', PLAYERS.length);

  return { campaignId: CAMPAIGN.id, alreadyExists: false };
}

/**
 * Get the Tuesday campaign data
 */
function getTuesdayCampaign() {
  return db.prepare('SELECT * FROM campaigns WHERE id = ?').get(TUESDAY_CAMPAIGN_ID);
}

module.exports = {
  TUESDAY_CAMPAIGN_ID,
  seedTuesdayCampaign,
  campaignExists,
  getTuesdayCampaign
};

// Run directly if called as script
if (require.main === module) {
  const forceReset = process.argv.includes('--reset') || process.argv.includes('-r');
  seedTuesdayCampaign(forceReset);
}
