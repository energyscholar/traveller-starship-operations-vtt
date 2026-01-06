/**
 * AR-289: Seed Solo Demo Campaign
 *
 * Creates a persistent demo campaign that any player can join:
 * - Campaign: Solo Demo - Spinward Scout
 * - Starting Location: Mora (Spinward Marches subsector capital)
 * - Ship: Far Horizon (Type-S Scout/Courier)
 * - PC: Alex Ryder (3-term Scout Survey veteran)
 *
 * Run with: node lib/operations/seed-solo-demo.js
 * Or auto-seeded on server start if campaign doesn't exist
 */

const { db, generateId } = require('./database');

// SECURITY: Block in production unless explicitly enabled
if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEMO_SEED) {
  console.error('ERROR: Seed script blocked in production. Set ALLOW_DEMO_SEED=true to override.');
  process.exit(1);
}

// Fixed campaign ID for deterministic access (valid UUID v4)
const SOLO_DEMO_CAMPAIGN_ID = '50100e00-de00-4000-8000-000000000001';

// Campaign data
const CAMPAIGN = {
  id: SOLO_DEMO_CAMPAIGN_ID,
  name: 'Solo Demo - Spinward Scout',
  gm_name: 'Demo',
  campaign_type: 'solo_demo',
  current_date: '001-1105',       // Start of Imperial year 1105
  current_system: 'Mora',
  current_sector: 'Spinward Marches',
  current_hex: '3124'             // Mora hex coordinates
};

// Scout PC: Alex Ryder (Mongoose Traveller legal)
// 3-term Scout (Survey branch), Senior Scout rank
// UPP 789988: STR 7, DEX 8, END 9, INT 9, EDU 8, SOC 8
const SCOUT_CHARACTER = {
  name: 'Alex Ryder',
  species: 'Human',
  homeworld: 'Mora',
  age: 34,
  upp: '789988',
  stats: { str: 7, dex: 8, end: 9, int: 9, edu: 8, soc: 8 },
  careers: [
    {
      name: 'Scout',
      specialty: 'Survey',
      terms: 3,
      rank: 2,
      rankTitle: 'Senior Scout'
    }
  ],
  skills: {
    Pilot: 2,
    Astrogation: 1,
    'Engineer (Power)': 1,
    'Electronics (Sensors)': 1,
    'Gun Combat (Slug)': 1,
    'Vacc Suit': 1,
    Mechanic: 1,
    Survival: 1
  },
  equipment: [
    'TL12 Vacc Suit',
    'Autopistol (2d6-3)',
    'Hand Computer',
    'Survey Scanner'
  ],
  credits: 20000,
  shipShares: 2,
  notes: 'Detached duty scout with ship benefit (Far Horizon). Ex-Survey branch, experienced in wilderness refueling and first contact protocols.'
};

// Player slot
const PLAYER_SLOT = {
  slot_name: 'Scout',
  role: 'captain',          // Default to Captain for solo play (can do all roles)
  default_role: 'captain',
  character_name: 'Alex Ryder',
  character_data: SCOUT_CHARACTER
};

// Ship: Far Horizon (Type-S Scout/Courier)
// Mongoose Traveller specs: 100t, Thrust 2, Jump-2, 40 HP
const SHIP = {
  name: 'Far Horizon',
  template_id: 'scout',
  ship_data: {
    id: 'far_horizon',
    name: 'Far Horizon',
    type: 'Scout/Courier',
    className: 'Type-S',
    techLevel: 12,
    tonnage: 100,
    hull: {
      hullPoints: 40,
      maxHullPoints: 40,
      configuration: 'streamlined'
    },
    armour: {
      rating: 4,
      type: 'Crystaliron'
    },
    thrust: 2,
    jump: 2,
    fuel: {
      capacity: 40,  // Type-S Scout fuel tankage (Mongoose 2E)
      current: 23,   // Starting partially full at Mora Highport
      jumpRange: 2,
      breakdown: { refined: 23, unrefined: 0, processed: 0 }
    },
    crew: {
      pilot: 1,
      astrogator: 1,
      engineer: 1
    },
    weapons: [
      {
        id: 'turret_1_laser',
        type: 'pulse_laser',
        name: 'Pulse Laser',
        damage: '2d6',
        mount: 'double_turret',
        slot: 1,
        range: 'Medium',
        operator: 'Alex Ryder'
      },
      {
        id: 'turret_1_sand',
        type: 'sandcaster',
        name: 'Sandcaster',
        damage: 'defense',
        mount: 'double_turret',
        slot: 1,
        ammo: 20,
        ammo_current: 20,
        ammo_max: 20,
        range: 'Close',
        operator: 'Alex Ryder'
      }
    ],
    sensors: 'Military',
    sensorGrade: 'military',
    computer: 'Computer/5bis',
    software: {
      jumpControl: 2,
      library: true,
      manoeuvre: 0,
      fireControl: 1,
      bandwidthUsed: 3,
      bandwidthAvailable: 10
    },
    systems: {
      fuelScoop: true,
      fuelProcessor: true,
      probeDrones: 10,
      workshop: true,
      airRaft: true
    },
    staterooms: 4,
    cargo: 12,
    cost: 36940000,
    maintenance: 3078
  },
  visible_to_players: true,
  is_party_ship: true,
  current_state: {
    fuel: 23,
    fuelBreakdown: { refined: 23, unrefined: 0, processed: 0 },
    power: 100,
    hull: 40,
    systemHex: '3124',
    locationId: 'loc-dock-highport',
    locationName: 'Mora Highport',
    positionVerified: true
  }
};

// Welcome email from Scout Service
const WELCOME_EMAIL = {
  sender_type: 'NPC',
  sender_name: 'Scout Service HQ',
  recipient_type: 'player',
  subject: 'Detached Duty Orders - ISS Far Horizon',
  body: `Senior Scout Ryder,

Congratulations on your detached duty assignment. The ISS Far Horizon is now yours to command under the standard Scout Service detached duty terms.

Your vessel is currently berthed at Mora Highport, fully fueled and provisioned. As a reminder:

• The Far Horizon remains Scout Service property but is at your disposal
• You retain your rank and may be recalled for service missions
• Fuel and maintenance at Scout bases is provided at no charge
• You are encouraged to file survey reports for unexplored regions

We suggest your first mission be a courier run to Regina (J-2 from here). The subsector capital has several opportunities for an enterprising scout.

Safe travels, Senior Scout.

— IISS Administrative Division, Mora`,
  priority: 'NORMAL',
  status: 'SENT'
};

/**
 * Check if solo demo campaign already exists
 */
function campaignExists() {
  const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(SOLO_DEMO_CAMPAIGN_ID);
  return !!campaign;
}

/**
 * Delete existing solo demo campaign (for reset)
 */
function deleteExisting() {
  console.log('[SeedSoloDemo] Deleting existing solo demo campaign...');

  // Delete in correct order for foreign key constraints
  db.prepare('DELETE FROM mail WHERE campaign_id = ?').run(SOLO_DEMO_CAMPAIGN_ID);
  db.prepare('DELETE FROM npc_crew WHERE ship_id IN (SELECT id FROM ships WHERE campaign_id = ?)').run(SOLO_DEMO_CAMPAIGN_ID);
  db.prepare('DELETE FROM ships WHERE campaign_id = ?').run(SOLO_DEMO_CAMPAIGN_ID);
  db.prepare('DELETE FROM player_accounts WHERE campaign_id = ?').run(SOLO_DEMO_CAMPAIGN_ID);
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(SOLO_DEMO_CAMPAIGN_ID);

  console.log('[SeedSoloDemo] Existing campaign deleted');
}

/**
 * Seed the solo demo campaign
 */
function seedSoloDemoCampaign(forceReset = false) {
  console.log('[SeedSoloDemo] Starting solo demo campaign seed...');

  // Check if already exists
  if (campaignExists()) {
    if (forceReset) {
      deleteExisting();
    } else {
      console.log('[SeedSoloDemo] Solo demo campaign already exists, checking for updates...');
      // Update Alex Ryder's role to captain if still pilot (migration)
      const updated = db.prepare(`
        UPDATE player_accounts SET role = 'captain', default_role = 'captain'
        WHERE campaign_id = ? AND role = 'pilot'
      `).run(SOLO_DEMO_CAMPAIGN_ID);
      if (updated.changes > 0) {
        console.log('[SeedSoloDemo] Updated Alex Ryder default role to captain');
      }
      return { campaignId: SOLO_DEMO_CAMPAIGN_ID, alreadyExists: true };
    }
  }

  // Create campaign
  console.log('[SeedSoloDemo] Creating campaign:', CAMPAIGN.name);
  db.prepare(`
    INSERT INTO campaigns (id, name, gm_name, current_date, current_system, current_sector, current_hex, campaign_type, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    CAMPAIGN.id,
    CAMPAIGN.name,
    CAMPAIGN.gm_name,
    CAMPAIGN.current_date,
    CAMPAIGN.current_system,
    CAMPAIGN.current_sector,
    CAMPAIGN.current_hex,
    CAMPAIGN.campaign_type
  );

  // Create ship
  const shipId = generateId();
  console.log('[SeedSoloDemo] Creating ship:', SHIP.name);
  db.prepare(`
    INSERT INTO ships (id, campaign_id, name, template_id, ship_data, visible_to_players, is_party_ship, current_state, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    shipId,
    CAMPAIGN.id,
    SHIP.name,
    SHIP.template_id,
    JSON.stringify(SHIP.ship_data),
    SHIP.visible_to_players ? 1 : 0,
    SHIP.is_party_ship ? 1 : 0,
    JSON.stringify(SHIP.current_state)
  );

  // Create player slot
  const accountId = generateId();
  console.log('[SeedSoloDemo] Creating player slot:', PLAYER_SLOT.slot_name);
  db.prepare(`
    INSERT INTO player_accounts (id, campaign_id, slot_name, role, character_name, character_data, ship_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    accountId,
    CAMPAIGN.id,
    PLAYER_SLOT.slot_name,
    PLAYER_SLOT.role,
    PLAYER_SLOT.character_name,
    JSON.stringify(PLAYER_SLOT.character_data),
    shipId
  );

  // Create welcome email
  const mailId = generateId();
  console.log('[SeedSoloDemo] Creating welcome email');
  db.prepare(`
    INSERT INTO mail (id, campaign_id, sender_type, sender_name, recipient_type, recipient_id, subject, body, priority, status, sent_date, delivery_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
  `).run(
    mailId,
    CAMPAIGN.id,
    WELCOME_EMAIL.sender_type,
    WELCOME_EMAIL.sender_name,
    WELCOME_EMAIL.recipient_type,
    accountId,
    WELCOME_EMAIL.subject,
    WELCOME_EMAIL.body,
    WELCOME_EMAIL.priority,
    WELCOME_EMAIL.status
  );

  console.log('[SeedSoloDemo] ✓ Solo demo campaign created successfully');
  console.log('[SeedSoloDemo] Campaign ID:', CAMPAIGN.id);
  console.log('[SeedSoloDemo] Ship:', SHIP.name);
  console.log('[SeedSoloDemo] PC:', SCOUT_CHARACTER.name);
  console.log('[SeedSoloDemo] Location:', CAMPAIGN.current_system);

  return {
    campaignId: CAMPAIGN.id,
    shipId,
    accountId,
    alreadyExists: false
  };
}

/**
 * Get the solo demo campaign data
 */
function getSoloDemoCampaign() {
  return db.prepare('SELECT * FROM campaigns WHERE id = ?').get(SOLO_DEMO_CAMPAIGN_ID);
}

/**
 * Get the solo demo player account
 * NOTE: Must parse character_data JSON - raw DB returns string, not object
 */
function getSoloDemoAccount() {
  const account = db.prepare('SELECT * FROM player_accounts WHERE campaign_id = ?')
    .get(SOLO_DEMO_CAMPAIGN_ID);
  if (account) {
    // Parse JSON fields (DB stores as strings)
    if (account.character_data) {
      account.character_data = JSON.parse(account.character_data);
    }
    if (account.preferences) {
      account.preferences = JSON.parse(account.preferences);
    }
  }
  return account;
}

// Export for use in server
module.exports = {
  SOLO_DEMO_CAMPAIGN_ID,
  seedSoloDemoCampaign,
  campaignExists,
  getSoloDemoCampaign,
  getSoloDemoAccount
};

// Run directly if called as script
if (require.main === module) {
  const forceReset = process.argv.includes('--reset') || process.argv.includes('-r');
  seedSoloDemoCampaign(forceReset);
}
