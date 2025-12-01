/**
 * Seed System Data for Operations VTT
 * Run with: node lib/operations/seed-systems.js [campaignId] [systemName]
 *
 * Adds celestial contacts (stars, planets, stations) for a star system.
 * Systems available: ator, flammarion
 */

const { db, generateId } = require('./database');

// ==================== ATOR SYSTEM DATA ====================
// Source: https://wiki.travellerrpg.com/Ator_(world)
// Spinward Marches 0729 - Darrian Subsector
const ATOR_SYSTEM = {
  name: 'Ator',
  sector: 'Spinward Marches',
  subsector: 'Darrian',
  hex: '0729',
  uwp: 'D426258-7',
  tradeCodes: ['Lo', 'Ni'],  // Low Population, Non-Industrial
  allegiance: 'Na',  // Non-Aligned (Darrian control as of 1135)
  stellar: {
    primary: 'F7 V',
    secondary: 'M2 V',
    type: 'Binary'
  },
  worlds: 8,
  gasGiants: 2,
  planetoidBelts: 1,
  bases: [],
  notes: 'Archaeological site with suspected Ancient artifacts. Former Sword World occupation (1132-1135), now under Darrian protection.',
  wikiUrl: 'https://wiki.travellerrpg.com/Ator_(world)'
};

const ATOR_CONTACTS = [
  {
    name: 'Ator Primary',
    type: 'Star',
    bearing: 0,
    range_km: 150000000,  // ~1 AU
    range_band: 'stellar',
    transponder: 'NONE',
    signature: 'stellar',
    visible_to: 'all',
    gm_notes: 'F7 V white-yellow main sequence. Primary of binary system.',
    celestial: true,
    stellar_class: 'F7 V',
    wikiUrl: 'https://wiki.travellerrpg.com/Ator_(world)'
  },
  {
    name: 'Ator Secondary',
    type: 'Star',
    bearing: 180,
    range_km: 2400000000,  // ~16 AU
    range_band: 'stellar',
    transponder: 'NONE',
    signature: 'stellar',
    visible_to: 'all',
    gm_notes: 'M2 V red dwarf. Companion star at outer system.',
    celestial: true,
    stellar_class: 'M2 V'
  },
  {
    name: 'Ator',
    type: 'Planet',
    bearing: 270,
    range_km: 35000,
    range_band: 'planetary',
    transponder: 'ATOR BEACON',
    signature: 'planetary',
    visible_to: 'all',
    gm_notes: 'Small world with tainted atmosphere. Pop ~800. Feudal Technocracy. Law 8 (controlled blades). Ancient artifact site.',
    celestial: true,
    uwp: 'D426258-7',
    tradeCodes: ['Lo', 'Ni'],
    wikiUrl: 'https://wiki.travellerrpg.com/Ator_(world)'
  },
  {
    name: 'Ator Downport',
    type: 'Station',
    bearing: 268,
    range_km: 500,
    range_band: 'close',
    transponder: 'ATOR STARPORT',
    signature: 'station',
    visible_to: 'all',
    gm_notes: 'Class D Poor starport. Minor repairs only. Unrefined fuel. Archaeological expedition headquarters.',
    celestial: false,
    uwp: 'D426258-7'
  },
  {
    name: 'Ator Gas Giant',
    type: 'Gas Giant',
    bearing: 45,
    range_km: 450000000,  // ~3 AU
    range_band: 'stellar',
    transponder: 'NONE',
    signature: 'planetary',
    visible_to: 'all',
    gm_notes: 'Primary gas giant. Good for wilderness refueling.',
    celestial: true
  },
  {
    name: 'Outer Gas Giant',
    type: 'Gas Giant',
    bearing: 225,
    range_km: 1200000000,  // ~8 AU
    range_band: 'stellar',
    transponder: 'NONE',
    signature: 'planetary',
    visible_to: 'all',
    gm_notes: 'Secondary gas giant near companion star.',
    celestial: true
  },
  {
    name: 'Ator Belt',
    type: 'Planetoid Belt',
    bearing: 90,
    range_km: 280000000,  // ~1.9 AU
    range_band: 'belt',
    transponder: 'NONE',
    signature: 'debris',
    visible_to: 'all',
    gm_notes: 'Main planetoid belt. Possible Ancient artifact debris.',
    celestial: true
  }
];

// ==================== FLAMMARION SYSTEM DATA ====================
// Source: https://wiki.travellerrpg.com/Flammarion_(world)
// Spinward Marches 0930 - Sword Worlds Subsector
const FLAMMARION_SYSTEM = {
  name: 'Flammarion',
  sector: 'Spinward Marches',
  subsector: 'Sword Worlds',
  hex: '0930',
  uwp: 'A623514-B',
  tradeCodes: ['Ni', 'Po'],  // Non-Industrial, Poor
  allegiance: 'Im',  // Third Imperium
  stellar: {
    primary: 'F8 V',
    mass: 1.18,
    temperature: '6050-6180 K'
  },
  worlds: 11,
  gasGiants: 0,
  planetoidBelts: 1,
  bases: ['N', 'S'],  // Naval Base, Scout Base
  notes: 'Corporate world (Ling-Standard Products). Excellent starport with shipyard. Naval and Scout bases on moon.',
  wikiUrl: 'https://wiki.travellerrpg.com/Flammarion_(world)'
};

const FLAMMARION_CONTACTS = [
  {
    name: 'Flammarion Primary',
    type: 'Star',
    bearing: 0,
    range_km: 165000000,  // ~1.1 AU
    range_band: 'stellar',
    transponder: 'NONE',
    signature: 'stellar',
    visible_to: 'all',
    gm_notes: 'F8 V white main sequence. Mass 1.18 Sol. 6050-6180 K.',
    celestial: true,
    stellar_class: 'F8 V',
    wikiUrl: 'https://wiki.travellerrpg.com/Flammarion_(world)'
  },
  {
    name: 'Flammarion',
    type: 'Planet',
    bearing: 270,
    range_km: 42000,
    range_band: 'planetary',
    transponder: 'FLAMMARION CONTROL',
    signature: 'planetary',
    visible_to: 'all',
    gm_notes: 'Medium world, very thin tainted atmosphere. Pop 700,000. Corporate gov (Ling-Standard Products). TL11.',
    celestial: true,
    uwp: 'A623514-B',
    tradeCodes: ['Ni', 'Po'],
    wikiUrl: 'https://wiki.travellerrpg.com/Flammarion_(world)'
  },
  {
    name: 'Flammarion Highport',
    type: 'Station',
    bearing: 268,
    range_km: 400,
    range_band: 'close',
    transponder: 'FLAMMARION HIGHPORT',
    signature: 'station',
    visible_to: 'all',
    gm_notes: 'Class A Excellent starport. Full shipyard facilities. 9,575 port employees. 8,000 passengers/year.',
    celestial: false,
    uwp: 'A623514-B'
  },
  {
    name: 'Flammarion Moon',
    type: 'Moon',
    bearing: 275,
    range_km: 85000,
    range_band: 'planetary',
    transponder: 'FLAMMARION BASES',
    signature: 'normal',
    visible_to: 'all',
    gm_notes: 'Large moon hosting Imperial Naval Base and Scout/X-Boat station.',
    celestial: true
  },
  {
    name: 'Naval Base Flammarion',
    type: 'Naval Base',
    bearing: 276,
    range_km: 85500,
    range_band: 'planetary',
    transponder: 'INS FLAMMARION',
    signature: 'military',
    visible_to: 'all',
    gm_notes: 'Imperial Naval Base. Patrol and system defense operations. RESTRICTED APPROACH.',
    celestial: false
  },
  {
    name: 'Scout Base',
    type: 'Scout Base',
    bearing: 274,
    range_km: 84500,
    range_band: 'planetary',
    transponder: 'IISS FLAMMARION',
    signature: 'normal',
    visible_to: 'all',
    gm_notes: 'Imperial Interstellar Scout Service base. X-Boat link to greater Imperium.',
    celestial: false
  },
  {
    name: 'Flammarion Belt',
    type: 'Planetoid Belt',
    bearing: 135,
    range_km: 380000000,  // ~2.5 AU
    range_band: 'belt',
    transponder: 'NONE',
    signature: 'debris',
    visible_to: 'all',
    gm_notes: 'Main planetoid belt. Mining operations by LSP subsidiaries.',
    celestial: true
  },
  {
    name: 'LSP Mining Platform',
    type: 'Station',
    bearing: 138,
    range_km: 385000000,
    range_band: 'belt',
    transponder: 'LSP-FLAMM-MINING',
    signature: 'station',
    visible_to: 'all',
    gm_notes: 'Ling-Standard Products mining platform in the belt.',
    celestial: false
  }
];

/**
 * Get system data by name
 */
function getSystemData(systemName) {
  const name = systemName.toLowerCase();
  switch (name) {
    case 'ator':
      return { system: ATOR_SYSTEM, contacts: ATOR_CONTACTS };
    case 'flammarion':
      return { system: FLAMMARION_SYSTEM, contacts: FLAMMARION_CONTACTS };
    default:
      return null;
  }
}

/**
 * Seed system contacts for a campaign
 * @param {string} campaignId - Campaign to add contacts to
 * @param {string} systemName - System name (ator, flammarion)
 */
function seedSystemContacts(campaignId, systemName) {
  const data = getSystemData(systemName);
  if (!data) {
    console.error(`Unknown system: ${systemName}`);
    console.log('Available systems: ator, flammarion');
    return null;
  }

  const { system, contacts } = data;

  console.log(`\n========================================`);
  console.log(`SEEDING ${system.name.toUpperCase()} SYSTEM`);
  console.log(`========================================`);
  console.log(`Campaign ID: ${campaignId}`);
  console.log(`System: ${system.name} (${system.hex})`);
  console.log(`UWP: ${system.uwp}`);
  console.log(`Stellar: ${system.stellar.primary}${system.stellar.secondary ? ' / ' + system.stellar.secondary : ''}`);

  // Clear existing contacts for this campaign
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM contacts WHERE campaign_id = ?').get(campaignId).count;
  if (existingCount > 0) {
    console.log(`\nClearing ${existingCount} existing contacts...`);
    db.prepare('DELETE FROM contacts WHERE campaign_id = ?').run(campaignId);
  }

  // Update campaign system
  db.prepare('UPDATE campaigns SET current_system = ? WHERE id = ?').run(system.name, campaignId);

  // Insert contacts
  const insertContact = db.prepare(`
    INSERT INTO contacts (id, campaign_id, name, type, bearing, range_km, range_band, transponder, signature, visible_to, gm_notes, is_targetable, weapons_free, health, max_health, uwp, celestial, stellar_class, trade_codes, wiki_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  console.log('\nCreating contacts:');
  for (const contact of contacts) {
    const contactId = generateId();
    insertContact.run(
      contactId,
      campaignId,
      contact.name,
      contact.type,
      contact.bearing,
      contact.range_km,
      contact.range_band,
      contact.transponder,
      contact.signature,
      contact.visible_to,
      contact.gm_notes,
      contact.is_targetable || 0,
      contact.weapons_free || 0,
      contact.health || 0,
      contact.max_health || 0,
      contact.uwp || null,
      contact.celestial ? 1 : 0,
      contact.stellar_class || null,
      contact.tradeCodes ? JSON.stringify(contact.tradeCodes) : null,
      contact.wikiUrl || null
    );
    console.log(`  + ${contact.name} (${contact.type})`);
  }

  console.log(`\n========================================`);
  console.log(`SEEDING COMPLETE: ${contacts.length} contacts added`);
  console.log(`========================================\n`);

  return contacts.length;
}

/**
 * List available systems
 */
function listSystems() {
  console.log('\nAvailable Systems:');
  console.log('==================');
  console.log(`1. Ator (${ATOR_SYSTEM.hex}) - ${ATOR_SYSTEM.uwp}`);
  console.log(`   ${ATOR_SYSTEM.notes}`);
  console.log(`   Contacts: ${ATOR_CONTACTS.length}`);
  console.log('');
  console.log(`2. Flammarion (${FLAMMARION_SYSTEM.hex}) - ${FLAMMARION_SYSTEM.uwp}`);
  console.log(`   ${FLAMMARION_SYSTEM.notes}`);
  console.log(`   Contacts: ${FLAMMARION_CONTACTS.length}`);
  console.log('');
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--list') {
    listSystems();
    console.log('Usage: node seed-systems.js <campaignId> <systemName>');
    console.log('       node seed-systems.js --list');
  } else if (args.length === 2) {
    const [campaignId, systemName] = args;
    seedSystemContacts(campaignId, systemName);
  } else {
    console.log('Usage: node seed-systems.js <campaignId> <systemName>');
    console.log('       node seed-systems.js --list');
  }
}

module.exports = {
  seedSystemContacts,
  getSystemData,
  listSystems,
  ATOR_SYSTEM,
  ATOR_CONTACTS,
  FLAMMARION_SYSTEM,
  FLAMMARION_CONTACTS
};
