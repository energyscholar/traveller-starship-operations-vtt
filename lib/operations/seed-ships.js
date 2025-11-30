/**
 * Seed Operations Database with Ship Templates
 * Run with: node lib/operations/seed-ships.js
 */

const fs = require('fs');
const path = require('path');
const { db, generateId } = require('./database');

const SHIP_TEMPLATES_DIR = path.join(__dirname, '../../data/ships/v2');

/**
 * Load all ship templates from v2 directory
 */
function loadShipTemplates() {
  const files = fs.readdirSync(SHIP_TEMPLATES_DIR)
    .filter(f => f.endsWith('.json'));

  const templates = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(SHIP_TEMPLATES_DIR, file), 'utf8');
      const template = JSON.parse(content);
      templates.push(template);
      console.log(`  Loaded: ${template.name} (${template.tonnage} tons)`);
    } catch (err) {
      console.error(`  Error loading ${file}:`, err.message);
    }
  }

  return templates;
}

/**
 * Create default NPC crew for a ship based on its crew requirements
 */
function generateDefaultNPCCrew(shipId, crewRequirements) {
  const crew = [];
  const names = {
    pilot: ['Miller', 'Chen', 'Rodriguez', 'Williams', 'Brown'],
    astrogator: ['Navigation Officer', 'Stellar', 'Course'],
    engineer: ['Chief Engineer', 'Wilson', 'Thompson'],
    gunner: ['Gunner One', 'Gunner Two', 'Gunner Three', 'Gunner Four'],
    steward: ['Chief Steward', 'Porter', 'Service'],
    medic: ['Ship\'s Doctor', 'Medical Officer'],
    marines: ['Sergeant', 'Corporal', 'Private']
  };

  const minCrew = crewRequirements.minimum || {};

  for (const [role, count] of Object.entries(minCrew)) {
    for (let i = 0; i < count; i++) {
      const roleNames = names[role] || ['Crew'];
      crew.push({
        id: generateId(),
        ship_id: shipId,
        name: roleNames[i % roleNames.length] + (count > 1 && roleNames.length <= i ? ` ${i + 1}` : ''),
        role: role,
        skill_level: 0,  // Default NPC skill is 0
        personality: null,
        is_ai: 0
      });
    }
  }

  return crew;
}

/**
 * Seed ships into the database
 * Creates a "Template" campaign with all available ship types
 */
function seedShips() {
  console.log('========================================');
  console.log('SEEDING OPERATIONS DATABASE');
  console.log('========================================');

  // Load ship templates
  console.log('\n1. Loading ship templates...');
  const templates = loadShipTemplates();
  console.log(`   Found ${templates.length} ship templates`);

  // Check if template campaign already exists
  console.log('\n2. Checking for template campaign...');
  const existingCampaign = db.prepare(
    "SELECT * FROM campaigns WHERE name = 'Ship Templates'"
  ).get();

  let campaignId;
  if (existingCampaign) {
    console.log(`   Using existing campaign: ${existingCampaign.id}`);
    campaignId = existingCampaign.id;

    // Clear existing ships in this campaign
    console.log('   Clearing existing template ships...');
    const existingShips = db.prepare(
      'SELECT id FROM ships WHERE campaign_id = ?'
    ).all(campaignId);

    for (const ship of existingShips) {
      db.prepare('DELETE FROM npc_crew WHERE ship_id = ?').run(ship.id);
    }
    db.prepare('DELETE FROM ships WHERE campaign_id = ?').run(campaignId);
  } else {
    // Create template campaign
    console.log('   Creating template campaign...');
    campaignId = generateId();
    db.prepare(`
      INSERT INTO campaigns (id, name, gm_name, current_date, current_system)
      VALUES (?, ?, ?, ?, ?)
    `).run(campaignId, 'Ship Templates', 'System', '1105-001', 'Regina');
    console.log(`   Created campaign: ${campaignId}`);
  }

  // Insert ships
  console.log('\n3. Creating ships from templates...');
  const insertShip = db.prepare(`
    INSERT INTO ships (id, campaign_id, name, template_id, ship_data, visible_to_players, is_party_ship, current_state)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertNPC = db.prepare(`
    INSERT INTO npc_crew (id, ship_id, name, role, skill_level, personality, is_ai)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const template of templates) {
    const shipId = generateId();
    const shipData = {
      ...template,
      hullPoints: template.hull?.hullPoints || 40,
      maxHullPoints: template.hull?.hullPoints || 40,
      armourRating: template.armour?.rating || 0
    };

    // Insert ship
    insertShip.run(
      shipId,
      campaignId,
      template.name,
      template.id,
      JSON.stringify(shipData),
      1,  // visible_to_players
      1,  // is_party_ship (for templates, all are party ships)
      JSON.stringify({ alertStatus: 'NORMAL' })
    );

    console.log(`   Created ship: ${template.name} (${shipId})`);

    // Generate and insert default NPC crew
    if (template.crew) {
      const npcCrew = generateDefaultNPCCrew(shipId, template.crew);
      for (const npc of npcCrew) {
        insertNPC.run(npc.id, npc.ship_id, npc.name, npc.role, npc.skill_level, npc.personality, npc.is_ai);
      }
      console.log(`      Added ${npcCrew.length} NPC crew members`);
    }
  }

  // Summary
  console.log('\n========================================');
  console.log('SEEDING COMPLETE');
  console.log('========================================');
  console.log(`Campaign ID: ${campaignId}`);
  console.log(`Ships created: ${templates.length}`);
  console.log(`\nTo use these ships in a new campaign, copy the`);
  console.log(`campaign ID or clone the template ships.`);
  console.log('========================================');

  return campaignId;
}

// Run if called directly
if (require.main === module) {
  seedShips();
}

module.exports = { seedShips, loadShipTemplates };
