/**
 * Seed System Data for Operations VTT
 * Run with: node lib/operations/seed-systems.js [campaignId] [systemName]
 *
 * Adds celestial contacts (stars, planets, stations) for a star system.
 * Systems available: dorannia, ator, flammarion
 *
 * Travel Route: Dorannia → Ator (J-1) → Flammarion (J-2)
 * Context: PCs escaped from Bularia, hunted by Garoovian Navy
 */

const { db, generateId } = require('./database');

// ==================== DORANNIA SYSTEM DATA ====================
// Source: https://wiki.travellerrpg.com/Dorannia_(world)
// Spinward Marches 1525 - District 268 Subsector
const DORANNIA_SYSTEM = {
  name: 'Dorannia',
  sector: 'Spinward Marches',
  subsector: 'District 268',
  hex: '1525',
  uwp: 'B8B4643-9',
  tradeCodes: ['Fl', 'Ni'],  // Fluid Oceans, Non-Industrial
  allegiance: 'Im',  // Third Imperium
  stellar: {
    primary: 'G0 V',
    type: 'Single'
  },
  worlds: 7,
  gasGiants: 3,
  planetoidBelts: 1,
  bases: [],
  notes: 'Exotic fluid-ocean world with methane atmosphere. Mining colony. Jump point for travel to Sword Worlds border.',
  wikiUrl: 'https://wiki.travellerrpg.com/Dorannia_(world)',
  // Role-specific content
  roleContent: {
    captain: 'Rumors of Garoovian bounty hunters frequenting the system. Keep a low profile.',
    astrogator: 'Good jump routes to Ator (J-1) or direct to Flammarion (J-2). Review approach vectors.',
    pilot: 'Fluid oceans make landing dangerous. Orbital docking recommended.',
    engineer: 'Fuel skimming from gas giant possible. Recommend refined fuel from starport.',
    sensors: 'High methane atmosphere creates sensor distortion near planet. Clear readings in outer system.',
    gunner: 'Target practice asteroids in the belt. Request authorization from Captain.',
    medic: 'Methane atmosphere exposure requires decontamination protocols.',
    steward: 'Limited passenger traffic. Mining crews may need transport.',
    cargo: 'Processed methane exports. Mining equipment imports.'
  },
  // System news and mail
  news: [
    { headline: 'MINING OUTPUT INCREASES 12%', source: 'Dorannia Mining Consortium', content: 'Q3 production figures exceed projections. Methane exports to rimward systems continue to grow.' },
    { headline: 'STARPORT UPGRADES APPROVED', source: 'Subsector News Wire', content: 'Dorannia Highport receives funding for berthing expansion. Work expected to complete 1106.' },
    { headline: 'TRAVEL ADVISORY: SWORD WORLDS BORDER', source: 'Imperial Travel Bureau', content: 'Heightened naval activity along Sword Worlds frontier. Commercial vessels advised to verify documentation.' }
  ],
  mail: {
    captain: { from: 'Anonymous Source', subject: 'Warning', content: 'Word is that Garoovian agents have been asking questions at the last three starports. They know your ship. Consider a new transponder code. - A Friend' },
    astrogator: { from: 'Spinward Main Navigation Guild', subject: 'Updated Route Data', content: 'Attached: Latest jump calibration data for the Ator-Flammarion corridor. Binary star corrections included.' },
    engineer: { from: 'Drive Tech Quarterly', subject: 'Recall Notice', content: 'Your ship model may be affected by the TL9 fuel processor seal recall. Inspection recommended at next class A port.' },
    medic: { from: 'Sector Health Authority', subject: 'Medical Advisory', content: 'Tainted atmosphere exposure protocols updated. New decontamination procedures effective immediately.' }
  }
};

const DORANNIA_CONTACTS = [
  {
    name: 'Dorannia Primary',
    type: 'Star',
    bearing: 0,
    range_km: 85000000,  // ~0.57 AU - habitable zone for K4V
    range_band: 'stellar',
    transponder: 'NONE',
    signature: 'stellar',
    visible_to: 'all',
    gm_notes: 'K4 V orange main sequence star. Mass 0.73 Sol, Luminosity 0.33.',
    celestial: true,
    stellar_class: 'K4 V',
    stellar_info: JSON.stringify({
      temperature: '4,440-4,600 K',
      luminosity: '0.33 Solar',
      mass: '0.73 Solar',
      habitableZone: '0.5-0.7 AU',
      description: 'An orange main sequence dwarf star. Relatively cool and stable, providing modest energy output typical of K-class stars.'
    }),
    wiki_url: 'https://wiki.travellerrpg.com/Dorannia_(world)'
  },
  {
    name: 'Dorannia',
    type: 'Planet',
    bearing: 270,
    range_km: 38000,
    range_band: 'planetary',
    transponder: 'DORANNIA BEACON',
    signature: 'planetary',
    visible_to: 'all',
    gm_notes: 'Large world with corrosive methane atmosphere. Fluid oceans. Pop ~3 million. TL9. Mining colony.',
    celestial: true,
    uwp: 'B8B4643-9',
    tradeCodes: ['Fl', 'Ni']
  },
  {
    name: 'Dorannia Highport',
    type: 'Station',
    bearing: 268,
    range_km: 400,
    range_band: 'close',
    transponder: 'DORANNIA STARPORT',
    signature: 'station',
    visible_to: 'all',
    gm_notes: 'Class B Good starport. Orbital only - no surface landing. Shipyard for small craft.',
    celestial: false,
    uwp: 'B8B4643-9'
  },
  {
    name: 'Inner Gas Giant',
    type: 'Gas Giant',
    bearing: 45,
    range_km: 280000000,  // ~1.9 AU
    range_band: 'stellar',
    transponder: 'NONE',
    signature: 'planetary',
    visible_to: 'all',
    gm_notes: 'Large gas giant. Primary fuel skimming location. 2d6 hours for refuel.',
    celestial: true
  },
  {
    name: 'Dorannia Belt',
    type: 'Planetoid Belt',
    bearing: 90,
    range_km: 450000000,  // ~3 AU
    range_band: 'belt',
    transponder: 'NONE',
    signature: 'debris',
    visible_to: 'all',
    gm_notes: 'Main asteroid belt. Mining operations. Good for target practice!',
    celestial: true
  },
  {
    name: 'Target Asteroid Alpha',
    type: 'Asteroid',
    bearing: 92,
    range_km: 25000,
    range_band: 'medium',
    transponder: 'NONE',
    signature: 'minimal',
    visible_to: 'gm',  // Hidden until sensors spot it
    gm_notes: 'Small iron-nickel asteroid. Good for weapons testing. ~50m diameter.',
    celestial: false,
    is_targetable: 1,
    weapons_free: 0,  // Captain must authorize
    health: 100,
    max_health: 100
  },
  {
    name: 'Target Asteroid Beta',
    type: 'Asteroid',
    bearing: 88,
    range_km: 28000,
    range_band: 'medium',
    transponder: 'NONE',
    signature: 'minimal',
    visible_to: 'gm',
    gm_notes: 'Smaller carbonaceous asteroid. ~30m diameter.',
    celestial: false,
    is_targetable: 1,
    weapons_free: 0,
    health: 75,
    max_health: 75
  },
  {
    name: 'Middle Gas Giant',
    type: 'Gas Giant',
    bearing: 180,
    range_km: 900000000,  // ~6 AU
    range_band: 'stellar',
    transponder: 'NONE',
    signature: 'planetary',
    visible_to: 'all',
    gm_notes: 'Secondary gas giant with extensive moon system.',
    celestial: true
  },
  {
    name: 'Outer Gas Giant',
    type: 'Gas Giant',
    bearing: 225,
    range_km: 1500000000,  // ~10 AU
    range_band: 'stellar',
    transponder: 'NONE',
    signature: 'planetary',
    visible_to: 'all',
    gm_notes: 'Outer gas giant. Ice giant type.',
    celestial: true
  },
  {
    name: 'Mining Platform D-7',
    type: 'Station',
    bearing: 93,
    range_km: 460000000,
    range_band: 'belt',
    transponder: 'DORANNIA-MINING-7',
    signature: 'station',
    visible_to: 'all',
    gm_notes: 'Automated mining platform. Crew of 12.',
    celestial: false
  }
];

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
  wikiUrl: 'https://wiki.travellerrpg.com/Ator_(world)',
  // Role-specific content with hunted context
  roleContent: {
    captain: 'Remote system - good for laying low. Darrian patrols infrequent. Watch for suspicious ships.',
    astrogator: 'Binary system complicates jump calculations. Flammarion is J-2 from here. Plot carefully.',
    pilot: 'Tainted atmosphere requires sealed craft. Small downport only - no repair facilities.',
    engineer: 'Class D port - unrefined fuel only. Gas giant skimming recommended. Check all seals.',
    sensors: 'Binary star interference affects deep scans. Archaeology site may have unusual readings.',
    gunner: 'Minimal traffic makes firing drills possible. Ancient debris in belt - avoid!',
    medic: 'Atmosphere tainted - filter masks required. Limited medical supplies at port.',
    steward: 'Sparse population (~800). Archaeological team may need supplies or transport.',
    cargo: 'Artifact trade strictly regulated. Food and equipment imports valued.'
  },
  news: [
    { headline: 'ANCIENT ARTIFACT DISCOVERY ANNOUNCED', source: 'Darrian Archaeological Survey', content: 'New chamber uncovered at primary dig site. Artifacts consistent with Ancient technology. Access restricted pending evaluation.' },
    { headline: 'DARRIAN PATROL ROTATION BEGINS', source: 'System Control', content: 'DNS Mireille arrives for standard 6-week patrol. All vessels reminded to maintain proper transponder codes.' },
    { headline: 'SWORD WORLDS TENSIONS EASE', source: 'Sector News Service', content: 'Diplomatic talks between Darrian Confederation and Sword Worlds show progress. Border incidents down 30%.' }
  ],
  mail: {
    captain: { from: 'Ship Registry Bureau', subject: 'Documentation Reminder', content: 'Your ship registration is due for renewal in 90 days. Recommend updating at next Class A starport.' },
    astrogator: { from: 'Binary Star Navigation Alert', subject: 'Calibration Data', content: 'Ator A/B orbital data updated. Companion star at current position creates optimal jump shadow window in 72 hours.' },
    sensors: { from: 'Anonymous', subject: 'Watch List', content: 'Two ships matching Garoovian profile passed through last week asking about a liner. Left spinward. Be careful.' },
    gunner: { from: 'Weapons Maintenance Monthly', subject: 'Tip of the Month', content: 'Belt asteroid practice improves accuracy. Just ensure Captain authorization and clear fire lanes!' }
  }
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
    stellar_info: JSON.stringify({
      temperature: '6,180-6,280 K',
      luminosity: '1.95 Solar',
      mass: '1.21 Solar',
      habitableZone: '1.3-1.5 AU',
      description: 'A white main sequence star, slightly hotter and more massive than Sol. Primary star of a binary system with a distant red dwarf companion.'
    }),
    wiki_url: 'https://wiki.travellerrpg.com/Ator_(world)'
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
    stellar_class: 'M2 V',
    stellar_info: JSON.stringify({
      temperature: '3,470-3,560 K',
      luminosity: '0.057 Solar',
      mass: '0.44 Solar',
      description: 'A dim red dwarf star, the distant companion to Ator Primary. Too faint to significantly warm the inner system.'
    })
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
  wikiUrl: 'https://wiki.travellerrpg.com/Flammarion_(world)',
  // Role-specific content - destination with Imperial presence
  roleContent: {
    captain: 'CAUTION: Naval base presence. Imperial jurisdiction - Garoovian claims may not hold, but stay alert.',
    astrogator: 'Destination reached. No gas giants for skimming - plan fuel purchases. Good X-boat links.',
    pilot: 'Class A port - full facilities. Very thin tainted atmosphere on surface. Use orbital approach.',
    engineer: 'Excellent shipyard for repairs and upgrades. Refined fuel available. Schedule maintenance.',
    sensors: 'Heavy traffic near port. Naval patrols active. Maintain proper transponder.',
    gunner: 'DO NOT engage near Naval Base. Imperial space - weapons must be safed on approach.',
    medic: 'Full medical facilities available. Restock supplies here.',
    steward: 'LSP corporate world - business travelers common. Upgrade passenger amenities.',
    cargo: 'Industrial imports from LSP. Belt mining exports. Good trade opportunities.'
  },
  news: [
    { headline: 'LSP QUARTERLY PROFITS EXCEED EXPECTATIONS', source: 'Financial Times Spinward', content: 'Ling-Standard Products reports 8% revenue growth. Belt mining operations credited with strong performance.' },
    { headline: 'NAVAL BASE EXERCISES SCHEDULED', source: 'INS Flammarion Command', content: 'System defense exercises planned for Days 145-152. Commercial traffic may experience minor delays.' },
    { headline: 'NEW X-BOAT ROUTE ANNOUNCED', source: 'Scout Service PR', content: 'Enhanced X-boat service to Sword Worlds border. Message transit times reduced by 40%.' },
    { headline: 'BOUNTY HUNTERS DETAINED AT PORT', source: 'Flammarion Security Bulletin', content: 'Two individuals carrying non-Imperial bounty warrants detained by port security. Reminder: Imperial law supersedes foreign claims.' }
  ],
  mail: {
    captain: { from: 'Flammarion Highport Authority', subject: 'Welcome & Advisory', content: 'Welcome to Flammarion. Note: Non-Imperial bounty claims have no legal standing here. However, we recommend discretion in your dealings. Safe travels.' },
    astrogator: { from: 'Navigation Guild, Flammarion Chapter', subject: 'Route Options', content: 'From Flammarion: Multiple routes available spinward. Consider Bowman (J-2) or continue to District 268. Updated charts attached.' },
    engineer: { from: 'LSP Shipyard Services', subject: 'Maintenance Special', content: '20% discount on annual maintenance for ships over 500 tons. Class A facilities available. Book now for priority scheduling.' },
    steward: { from: 'Passenger Services Guild', subject: 'Market Opportunity', content: 'High demand for transport to Regina cluster. Business class passengers willing to pay premium rates.' },
    medic: { from: 'Flammarion Medical Center', subject: 'Services Available', content: 'Full medical facilities. Bio-scanner calibration, cryo-revival certification, and emergency care. 24-hour availability.' }
  }
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
    stellar_info: JSON.stringify({
      temperature: '6,050-6,180 K',
      luminosity: '1.78 Solar',
      mass: '1.18 Solar',
      habitableZone: '1.2-1.4 AU',
      description: 'A yellow-white main sequence dwarf, slightly hotter and more massive than Sol. Provides the gravitational anchor for the system\'s 11 worlds and planetoid belt.'
    }),
    wiki_url: 'https://wiki.travellerrpg.com/Flammarion_(world)'
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
    case 'dorannia':
      return { system: DORANNIA_SYSTEM, contacts: DORANNIA_CONTACTS };
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

  // Update campaign system - AR-168: Also update hex and sector!
  db.prepare('UPDATE campaigns SET current_system = ?, current_hex = ?, current_sector = ? WHERE id = ?')
    .run(system.name, system.hex, system.sector || 'Spinward Marches', campaignId);

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
  console.log(`1. Dorannia (${DORANNIA_SYSTEM.hex}) - ${DORANNIA_SYSTEM.uwp}`);
  console.log(`   ${DORANNIA_SYSTEM.notes}`);
  console.log(`   Contacts: ${DORANNIA_CONTACTS.length}`);
  console.log('');
  console.log(`2. Ator (${ATOR_SYSTEM.hex}) - ${ATOR_SYSTEM.uwp}`);
  console.log(`   ${ATOR_SYSTEM.notes}`);
  console.log(`   Contacts: ${ATOR_CONTACTS.length}`);
  console.log('');
  console.log(`3. Flammarion (${FLAMMARION_SYSTEM.hex}) - ${FLAMMARION_SYSTEM.uwp}`);
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
  DORANNIA_SYSTEM,
  DORANNIA_CONTACTS,
  ATOR_SYSTEM,
  ATOR_CONTACTS,
  FLAMMARION_SYSTEM,
  FLAMMARION_CONTACTS
};
