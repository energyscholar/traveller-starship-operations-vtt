/**
 * Seed "Travelling the Spinward Marches" Campaign for Bruce
 * Run with: node lib/operations/seed-dorannia.js
 *
 * SECURITY: Blocked in production environment
 *
 * Creates a complete campaign setup:
 * - Campaign: Travelling the Spinward Marches (GM: Bruce)
 * - Starting Location: Dorannia
 * - Ship: Kimbly (Type S Scout)
 * - 5 Player slots: James, Von Sydo, Max, Marina, Asao
 * - 2 NPCs: Chance Dax (pilot), Garoo (steward)
 * - Sample sensor contacts
 * - Initial ship log entries
 *
 * Context: PCs escaped from Bularia, hunted by Garoovian Navy
 * Route: Dorannia → Ator → Flammarion
 */

const fs = require('fs');
const path = require('path');
const { db, generateId } = require('./database');
const { setCampaignAPIKey } = require('./ai-npc');

// SECURITY: Block in production
if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: Seed script blocked in production environment');
  process.exit(1);
}

// Campaign data
const CAMPAIGN = {
  name: 'Travelling the Spinward Marches',
  gm_name: 'Bruce',
  current_date: '310-1115',
  current_system: 'Flammarion',
  current_sector: 'Spinward Marches',
  current_hex: '0930'  // Flammarion is hex 0930 in Spinward Marches sector coords
};

// Player slots with default ship (Kimbly) and preferred roles
const PLAYER_SLOTS = [
  {
    slot_name: 'James',
    role: 'captain',
    default_role: 'captain',
    character_data: {
      name: 'James',
      skills: { tactics_naval: 3, leadership: 2 },
      notes: 'SECRET: Imperial Admiral, Naval Intel, Darrian (TL16)'
    }
  },
  {
    slot_name: 'Von Sydo',
    role: 'sensors',
    default_role: 'sensors',
    character_data: {
      name: 'Von Sydo',
      skills: { sensors: 2, gunner: 1, pilot: 1 },
      notes: 'SECRET: Illegal psion (teleport/telekinesis). Pet: Kimbly (Tenser Wolf)'
    }
  },
  {
    slot_name: 'Max',
    role: 'engineer',
    default_role: 'engineer',
    character_data: {
      name: 'Max',
      skills: { electronics: 2, mechanic: 2, medic: 1 },
      notes: 'Mad scientist, has salvaged chamax tech'
    }
  },
  {
    slot_name: 'Marina',
    role: 'gunner',
    default_role: 'gunner',
    character_data: {
      name: 'Marina',
      skills: { diplomat: 3, deception: 2, gunner: 1 },
      notes: 'Social specialist, face of the party'
    }
  },
  {
    slot_name: 'Asao',
    role: 'damage_control',
    default_role: 'damage_control',
    character_data: {
      name: 'Asao',
      skills: { melee: 3, vacc_suit: 2, mechanic: 1 },
      notes: 'Hairless Aslan, face on WANTED posters, target of Agent Thale'
    }
  }
];

// Ship: Kimbly (Type S Scout)
const SHIP = {
  name: 'Kimbly',
  template_id: 'scout',
  ship_data: {
    id: 'scout',
    name: 'Kimbly',
    type: 'Type S Scout/Courier',
    techLevel: 12,  // SHIP-1: Tech level for the ship
    tonnage: 100,
    hull: { hullPoints: 40, structure: 40 },
    armour: { rating: 4, type: 'Crystaliron' },
    thrust: 2,
    jump: 2,
    fuel: { capacity: 40, current: 40 },
    crew: {
      pilot: 1,
      astrogator: 1,
      engineer: 1,
      gunner: 1,
      steward: 0
    },
    weapons: [
      { type: 'pulse_laser', name: 'Pulse Laser', damage: '2d6', mount: 'triple_turret', slot: 1, range: 'Short' },
      { type: 'missile_launcher', name: 'Missile Rack', damage: '4d6', mount: 'triple_turret', slot: 2, ammo: 12, ammo_current: 12, ammo_max: 12, range: 'Long' },
      { type: 'sandcaster', name: 'Sandcaster', damage: 'defense', mount: 'triple_turret', slot: 3, ammo: 20, ammo_current: 20, ammo_max: 20, range: 'Close' }
    ],
    sensors: 'Military',
    computer: 'Model/2'
  },
  current_state: {
    alertStatus: 'NORMAL',
    hullPoints: 40,
    fuel: 38,  // Slightly less than full - Engineer can manage fuel
    power: 100,
    location: 'Dorannia System - Orbit',
    // Ship systems for Damage Control to monitor/repair
    systems: {
      'Jump Drive': { status: 'operational', health: 100 },
      'Maneuver Drive': { status: 'operational', health: 100 },
      'Power Plant': { status: 'operational', health: 100 },
      'Life Support': { status: 'operational', health: 100 },
      'Sensors': { status: 'operational', health: 100 },
      'Ship Training System': { status: 'damaged', health: 60, issue: 'Software corruption after last jump - needs recalibration' },
      'Backup Life Support': { status: 'degraded', health: 75, issue: 'Minor seal wear - recommend inspection' },
      'Comms Array': { status: 'operational', health: 100 },
      'Computer': { status: 'operational', health: 100 },
      'Turret': { status: 'operational', health: 100 }
    },
    // Astrogation data - jump plotted but not yet initiated
    astrogation: {
      destination: 'Ator',
      jumpDistance: 2,
      plotStatus: 'ready',
      fuelRequired: 20,
      estimatedArrival: '317-1115',
      hazards: ['Dust cloud near emergence point', 'High traffic system']
    },
    // Cargo manifest for Cargo role
    cargo: {
      capacity: 3,
      used: 2,
      manifest: [
        { item: 'Spare Parts', tons: 1, value: 10000 },
        { item: 'Personal Effects', tons: 1, value: 0 }
      ]
    }
  }
};

// NPC Crew
const NPC_CREW = [
  {
    name: 'Chance Dax',
    role: 'pilot',
    skill_level: 2,
    personality: 'Reliable, quiet, veteran spacer',
    is_ai: 0
  },
  {
    name: 'Garoo',
    role: 'steward',
    skill_level: 1,
    personality: 'Rescued Vargr, grateful but nervous, excellent cook',
    is_ai: 0
  }
];

// Dorannia System Data (Canonical - Spinward Marches 0530)
// Source: https://wiki.travellerrpg.com/Dorannia_(world)
const DORANNIA_SYSTEM = {
  name: 'Dorannia',
  sector: 'Spinward Marches',
  subsector: 'Darrian',
  hex: '0530',
  uwp: 'E42158A-8',
  tradeCodes: ['Ni', 'Po'],  // Non-Industrial, Poor
  allegiance: 'Na',  // Non-Aligned
  stellar: {
    primary: 'K4 V',  // Orange main sequence
    mass: 0.73,
    luminosity: 0.33238,
    temperature: '4440-4600 K'
  },
  worlds: 9,
  gasGiants: 0,
  planetoidBelts: 1,
  bases: [],
  notes: 'Known as "Atomic Dorannia" for radioactive ore exports. Naturally uninhabitable rockball with sealed habitats. Extreme law enforcement using defensive nuclear missile strategy.',
  wikiUrl: 'https://wiki.travellerrpg.com/Dorannia_(world)'
};

// Initial sensor contacts (including system celestial objects)
const CONTACTS = [
  // Celestial Objects - always visible
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
    wikiUrl: 'https://wiki.travellerrpg.com/Dorannia_(world)'
  },
  {
    name: 'Dorannia',
    type: 'Planet',
    bearing: 270,
    range_km: 45000,  // Close planetary orbit
    range_band: 'planetary',
    transponder: 'DORANNIA BEACON',
    signature: 'planetary',
    visible_to: 'all',
    gm_notes: '"Atomic Dorannia" - Radioactive ore exports. Population ~500,000 in sealed habitats. Civil Service Bureaucracy. EXTREME law level - no weapons allowed. TL8.',
    celestial: true,
    uwp: 'E42158A-8',
    tradeCodes: ['Ni', 'Po'],
    wikiUrl: 'https://wiki.travellerrpg.com/Dorannia_(world)'
  },
  {
    name: 'Dorannia Belt',
    type: 'Planetoid Belt',
    bearing: 135,
    range_km: 320000000,  // ~2.1 AU
    range_band: 'belt',
    transponder: 'NONE',
    signature: 'debris',
    visible_to: 'all',
    gm_notes: 'Main planetoid belt. Source of nickel-iron and radioactive ores. Multiple mining operations.',
    celestial: true
  },
  {
    name: 'Starport One',
    type: 'Station',
    bearing: 268,
    range_km: 800,  // In orbital position near planet
    range_band: 'close',
    transponder: 'DORANNIA STARPORT ONE',
    signature: 'station',
    visible_to: 'all',
    gm_notes: 'Class E Frontier starport. Minimal facilities - marked spot, no fuel, no repair. Orbital facility.',
    celestial: false,
    uwp: 'E42158A-8',  // Station reflects mainworld UWP
    captain_name: 'Dockmaster Reev Harlan'  // Station contact for hails
  },
  // Ships and Other Contacts
  {
    name: 'Beowulf-class',
    type: 'Free Trader',
    bearing: 45,
    range_km: 50000,
    range_band: 'long',
    transponder: 'FAR HORIZONS',
    signature: 'normal',
    visible_to: 'all',
    gm_notes: 'Legitimate trader, departing for Ator',
    captain_name: 'Yuki Tanaka'  // Will respond to hails
  },
  {
    name: 'Atomic Guard',
    type: 'System Defense Boat',
    bearing: 180,
    range_km: 80000,
    range_band: 'veryLong',
    transponder: 'DORANNIA PATROL 7',
    signature: 'military',
    visible_to: 'all',
    gm_notes: 'Local patrol, routine sweep',
    captain_name: 'Lieutenant Vance Korlo'  // Military, formal responses
  },
  {
    name: 'Unknown',
    type: 'Far Trader',
    bearing: 90,
    range_km: 120000,
    range_band: 'distant',
    transponder: 'STELLAR WIND',
    signature: 'normal',
    visible_to: 'all',
    gm_notes: 'Just arrived from rimward',
    captain_name: 'Marcus Chen'  // Will respond to hails
  },
  {
    name: 'Unknown Contact',
    type: 'Unknown',
    bearing: 270,
    range_km: 200000,
    range_band: 'extreme',
    transponder: 'NONE',
    signature: 'faint',
    visible_to: 'all',
    gm_notes: 'Agent Thale\'s ship - Imperial SDB running silent. Will close when Kimbly attempts jump.'
  },
  {
    name: 'Asteroid DRN-4417',
    type: 'Asteroid',
    bearing: 315,
    range_km: 5000,
    range_band: 'medium',
    transponder: 'NONE',
    signature: 'rocky',
    visible_to: 'all',
    gm_notes: 'Target practice rock. About 50m diameter, nickel-iron composition.',
    is_targetable: 1,
    weapons_free: 1,  // Asteroid is pre-authorized for target practice
    health: 20,
    max_health: 20
  }
];

// Initial ship log entries - ordered for typical gameplay flow:
// 1. Arrival → 2. Contact starport → 3. Refuel → 4. Departure planning
const LOG_ENTRIES = [
  {
    entry_type: 'arrival',
    message: 'Arrived in Dorannia system. Jump successful.',
    actor: 'Chance Dax',
    game_date: '309-1115 14:00'
  },
  {
    entry_type: 'system',
    message: 'Contact established with Dorannia Starport One.',
    actor: 'Comms',
    game_date: '309-1115 14:15'
  },
  {
    entry_type: 'system',
    message: 'Data link established.',
    actor: 'Comms',
    game_date: '309-1115 14:16'
  },
  {
    entry_type: 'comms',
    message: 'You have mail.',
    actor: 'Comms',
    game_date: '309-1115 14:17'
  },
  {
    entry_type: 'status',
    message: 'Docking at Atomic Dorannia orbital. Refueling in progress.',
    actor: 'Max',
    game_date: '309-1115 18:30'
  },
  {
    entry_type: 'status',
    message: 'Refueling complete. Ship systems nominal.',
    actor: 'Max',
    game_date: '310-1115 06:00'
  },
  {
    entry_type: 'captain',
    message: 'Plotting jump to Ator. Departure when crew ready.',
    actor: 'James',
    game_date: '310-1115 08:00'
  }
];

// NPC Contacts - People the crew knows
// visibleTo: array of player slot_names or ['all'] for everyone
const NPC_CONTACTS = [
  // === JAMES's Contacts (Imperial Admiral, Naval Intel) ===
  {
    name: 'Admiral Xiara Keln',
    title: 'Sector Intelligence Director',
    location: 'Mora (Spinward Marches)',
    description: 'Your superior in Naval Intelligence. Brilliant strategist, utterly pragmatic. She authorized your "death" to protect the mission.',
    loyalty: 4,
    visibleTo: ['James'],
    notes: 'SECRET: Knows James is alive. Can provide extraction if cover is blown. Emergency contact only.'
  },
  {
    name: 'Commander Reginald Cross',
    title: 'Naval Attaché, Retired',
    location: 'Glisten (Spinward Marches)',
    description: 'Old friend from the Academy. Now runs a quiet shipping concern that occasionally does favors for Naval Intel.',
    loyalty: 3,
    visibleTo: ['James'],
    notes: 'Can arrange safe passage, provide supplies. Owes James his life from the Battle of Andor.'
  },

  // === VON SYDO's Contacts (Illegal Psion) ===
  {
    name: 'The Weaver',
    title: 'Psion Network Coordinator',
    location: 'Unknown (moves frequently)',
    description: 'A mysterious figure who helps hidden psions stay hidden. Communicates through dead drops and coded messages.',
    loyalty: 2,
    visibleTo: ['Von Sydo'],
    notes: 'Only contact for the underground psion network. Never met in person. Uses elaborate communication protocols.'
  },
  {
    name: 'Jeri Tallux',
    title: 'Information Broker',
    location: 'Ator (District 268)',
    description: 'Shrewd Vilani woman who trades in secrets. Knows Von Sydo is "special" but not the details. Discretion for sale.',
    loyalty: 2,
    visibleTo: ['Von Sydo'],
    notes: 'Will sell information to highest bidder, but has never betrayed a client. Yet.'
  },

  // === MAX's Contacts (Mad Scientist, Chamax Tech) ===
  {
    name: 'Dr. Vera Solenski',
    title: 'Xenobiologist, University of Regina',
    location: 'Regina (Spinward Marches)',
    description: 'Brilliant but eccentric researcher. Fascinated by Max\'s "theoretical" questions about chamax biology.',
    loyalty: 3,
    visibleTo: ['Max'],
    notes: 'Would kill to see Max\'s samples. Literally. Keep her interested but at arm\'s length.'
  },
  {
    name: '"Parts" Nakano',
    title: 'Salvage Dealer',
    location: 'Flammarion (District 268)',
    description: 'Greasy, cheerful fence who asks no questions about where tech comes from. Surprisingly well-connected.',
    loyalty: 2,
    visibleTo: ['Max'],
    notes: 'Best source for illegal tech parts in the subsector. Takes payment in credits, favors, or "interesting items."'
  },

  // === MARINA's Contacts (Diplomat, Social Specialist) ===
  {
    name: 'Ambassador Delenn Forza',
    title: 'Trade Envoy, Sword Worlds Confederation',
    location: 'Flammarion (District 268)',
    description: 'Sophisticated diplomat from the Sword Worlds. Met Marina at a reception. Surprisingly friendly despite political tensions.',
    loyalty: 3,
    visibleTo: ['Marina'],
    notes: 'Useful for introductions in Sword Worlds territory. May have her own agenda.'
  },
  {
    name: 'Lady Cassandra Voss',
    title: 'Countess of Trexalon',
    location: 'Trexalon (District 268)',
    description: 'Wealthy noble with connections throughout the subsector. Collects interesting people. Finds Marina fascinating.',
    loyalty: 2,
    visibleTo: ['Marina'],
    notes: 'Can open doors in high society. Expects to be entertained with gossip and drama in return.'
  },

  // === ASAO's Contacts (Wanted Aslan, Underground) ===
  {
    name: 'Korax "Whisper"',
    title: 'Fixer',
    location: 'Ator (District 268)',
    description: 'Scarred Vargr who knows everyone in the shadows. Helped Asao disappear after the incident on Bularia.',
    loyalty: 3,
    visibleTo: ['Asao'],
    notes: 'Can arrange safe houses, false IDs, quiet passage. Hates Agent Thale personally - history there.'
  },
  {
    name: 'Aiko Tanaka',
    title: 'Former Mercenary',
    location: 'Flammarion (District 268)',
    description: 'Human woman, ex-marine. Served with Asao in a mercenary unit before "the incident." Still loyal.',
    loyalty: 4,
    visibleTo: ['Asao'],
    notes: 'Combat specialist. Will fight for Asao without question. Currently working security for a mining concern.'
  },

  // === COMMON CONTACTS (Visible to All) ===
  {
    name: 'Chance Dax',
    title: 'Pilot, Kimbly',
    location: 'Aboard Kimbly',
    description: 'Veteran spacer who\'s seen it all. Reliable, quiet, keeps the ship flying. Been with the crew since the early days.',
    loyalty: 4,
    visibleTo: ['all'],
    notes: 'NPC crew member. Excellent pilot (skill 2). Doesn\'t ask questions, doesn\'t volunteer information. Perfect crew.'
  },
  {
    name: 'Dr. Grz',
    title: 'Physician',
    location: 'Ator (District 268)',
    description: 'Eccentric but brilliant doctor who operates a clinic in Ator\'s lower decks. Asks no questions, treats anyone.',
    loyalty: 3,
    visibleTo: ['all'],
    notes: 'Discreet medical services. Has patched up the crew before. Collects payment in credits or "interesting medical data."'
  },
  {
    name: 'Marta Aliyev',
    title: 'Co-Owner, Aliyev Trading',
    location: 'Flammarion (District 268)',
    description: 'Sharp-eyed merchant woman. She and her husband Vince run a small but profitable trading company. Met the crew on Bularia.',
    loyalty: 2,
    visibleTo: ['all'],
    notes: 'Helped arrange passage from Bularia. Seems genuinely friendly but asks a lot of questions about the Darrians.'
  },
  {
    name: 'Vince Aliyev',
    title: 'Co-Owner, Aliyev Trading',
    location: 'Flammarion (District 268)',
    description: 'Quiet, methodical man who handles logistics for Aliyev Trading. Marta\'s husband. Ex-Navy.',
    loyalty: 2,
    visibleTo: ['all'],
    notes: 'Former Imperial Navy - engineering background. Handles cargo and ship maintenance for their operation.'
  },
  {
    name: 'Helena Chase',
    title: 'Claims Adjuster, JSI',
    location: 'Mora (Spinward Marches)',
    description: 'Jumpspace Insurance claims adjuster. Professional, thorough, and surprisingly helpful when claims are legitimate.',
    loyalty: 1,
    visibleTo: ['all'],
    notes: 'JSI covers the Kimbly. Helena has been the crew\'s contact for two minor claims. Efficient but plays by the book.'
  },
  {
    name: 'Marcus Webb',
    title: 'Regional Manager, JSI',
    location: 'Regina (Spinward Marches)',
    description: 'Helena\'s boss. Only met briefly. Authorized the crew\'s coverage despite their "interesting" travel history.',
    loyalty: 1,
    visibleTo: ['all'],
    notes: 'Higher authority for claims. Helena handles day-to-day but Webb signs off on anything significant.'
  }
];

// Welcome Emails - Received when arriving at Dorannia
const WELCOME_EMAILS = [
  // === JAMES ===
  {
    recipientSlot: 'James',
    senderName: 'Commander Cross',
    subject: 'Heard you were in the area',
    body: `James,

Word travels. I heard about Bularia - sorry about the mess. If you need anything, you know how to reach me.

The political situation in District 268 is... fluid. Watch yourself around Ator. The locals are nervous about all the Imperial attention lately.

Burn this after reading.

- R.C.

P.S. The new vintage from Glisten is exceptional. You should try it sometime.`,
    priority: 'normal'
  },

  // === VON SYDO ===
  {
    recipientSlot: 'Von Sydo',
    senderName: 'J.T.',
    subject: 'Package waiting',
    body: `Friend,

There's a package waiting for you at the usual place in Ator. Herbs for Kimbly - the good kind she likes.

Also heard there's someone asking questions about "unusual talents" in the sector. Be careful. The network is watching but we can't be everywhere.

Trust your instincts.

- J.T.`,
    priority: 'normal'
  },

  // === MAX ===
  {
    recipientSlot: 'Max',
    senderName: 'Dr. Solenski',
    subject: 'RE: Theoretical Biology Question',
    body: `Max,

Your question about "hypothetical" silicon-carbon hybrid metabolisms is fascinating! The theoretical energy requirements alone would be revolutionary.

I've attached some papers on extremophile biochemistry that might be relevant to your... theoretical research.

Please, if you ever have actual samples of such organisms, I would give ANYTHING to examine them. Purely for science, of course.

Warmly,
Dr. Vera Solenski
University of Regina
Department of Xenobiology

P.S. Coming to Regina anytime soon? Coffee?`,
    priority: 'normal'
  },

  // === MARINA ===
  {
    recipientSlot: 'Marina',
    senderName: 'Lady Voss',
    subject: 'Delightful to hear from you!',
    body: `Dearest Marina,

How wonderful that you survived that dreadful business on Bularia! I heard the most FASCINATING rumors. You simply MUST tell me everything when next we meet.

I'm hosting a small gathering on Trexalon in three weeks - nothing formal, just fifty of my closest friends. Do say you'll come?

Also, Ambassador Forza was asking about you. She seemed quite interested in your travel plans. Make of that what you will, darling.

Kisses,
Cassandra

P.S. I've attached an invitation. The theme is "Stars of the Marches." Do wear something fabulous.`,
    priority: 'normal'
  },

  // === ASAO ===
  {
    recipientSlot: 'Asao',
    senderName: 'Whisper',
    subject: 'eyes up',
    body: `your picture is on six stations now. old friend still hunting.

stay off ator main if you can. my people watching but cant cover everything.

got a lead on who sold you out on bularia. interested? not cheap.

reply through usual channel.

- w`,
    priority: 'high'
  },

  // === SHIP-WIDE (Everyone) ===
  {
    recipientSlot: 'all',
    senderName: 'Dorannia Starport Authority',
    subject: 'WELCOME TO ATOMIC DORANNIA',
    body: `=== DORANNIA STARPORT AUTHORITY ===
=== AUTOMATED WELCOME MESSAGE ===

Welcome to Atomic Dorannia, traveler.

IMPORTANT NOTICES:
• All weapons must remain aboard your vessel
• Personal radiation monitors recommended (available for rental)
• Ore processing tours available - book through Starport One
• Emergency services: Channel 16

SERVICES AVAILABLE:
• Unrefined fuel (local sources only)
• Basic provisions
• Ore export licenses
• Radiation treatment (if required)

ADVISORY: Current orbital traffic is MODERATE. Outbound traffic to Ator scheduled at 0800, 1400, 2000 daily.

Safe travels,
Dorannia Starport Authority
"Where atoms work for YOU"`,
    priority: 'low'
  }
];

/**
 * Seed the Dorannia Escape campaign
 */
function seedDoranniaCampaign() {
  console.log('========================================');
  console.log('SEEDING: TRAVELLING THE SPINWARD MARCHES');
  console.log('GM: Bruce');
  console.log('========================================');

  // Check if campaign already exists
  const existingCampaign = db.prepare(
    "SELECT * FROM campaigns WHERE name = ? AND gm_name = ?"
  ).get(CAMPAIGN.name, CAMPAIGN.gm_name);

  let campaignId;

  if (existingCampaign) {
    console.log(`\n⚠ Campaign already exists: ${existingCampaign.id}`);
    console.log('  Updating existing campaign...');
    campaignId = existingCampaign.id;

    // Update campaign details
    db.prepare(`
      UPDATE campaigns SET current_date = ?, current_system = ?, current_sector = ?, current_hex = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(CAMPAIGN.current_date, CAMPAIGN.current_system, CAMPAIGN.current_sector, CAMPAIGN.current_hex, campaignId);

    // Clear existing data for fresh seed
    console.log('  Clearing existing data...');
    const existingShips = db.prepare('SELECT id FROM ships WHERE campaign_id = ?').all(campaignId);
    for (const ship of existingShips) {
      db.prepare('DELETE FROM npc_crew WHERE ship_id = ?').run(ship.id);
      db.prepare('DELETE FROM ship_log WHERE ship_id = ?').run(ship.id);
    }
    db.prepare('DELETE FROM ships WHERE campaign_id = ?').run(campaignId);
    db.prepare('DELETE FROM contacts WHERE campaign_id = ?').run(campaignId);
    db.prepare('DELETE FROM player_accounts WHERE campaign_id = ?').run(campaignId);
    db.prepare('DELETE FROM npc_contacts WHERE campaign_id = ?').run(campaignId);
    db.prepare('DELETE FROM mail WHERE campaign_id = ?').run(campaignId);
  } else {
    // Create new campaign
    console.log('\n1. Creating campaign...');
    campaignId = generateId();
    db.prepare(`
      INSERT INTO campaigns (id, name, gm_name, current_date, current_system, current_sector, current_hex)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(campaignId, CAMPAIGN.name, CAMPAIGN.gm_name, CAMPAIGN.current_date, CAMPAIGN.current_system, CAMPAIGN.current_sector, CAMPAIGN.current_hex);
    console.log(`   Created: ${CAMPAIGN.name} (${campaignId})`);
  }

  // Set AI API key from environment for default adventure (AR-41)
  if (process.env.ANTHROPIC_API_KEY) {
    setCampaignAPIKey(campaignId, process.env.ANTHROPIC_API_KEY);
    console.log('   AI NPC: API key configured from environment');
  } else {
    console.log('   AI NPC: No API key (set ANTHROPIC_API_KEY to enable)');
  }

  // Create player slots (ship_id will be assigned after ship creation)
  console.log('\n2. Creating player slots...');
  const insertPlayer = db.prepare(`
    INSERT INTO player_accounts (id, campaign_id, slot_name, character_name, character_data, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const playerIds = [];
  for (const slot of PLAYER_SLOTS) {
    const playerId = generateId();
    playerIds.push(playerId);
    insertPlayer.run(
      playerId,
      campaignId,
      slot.slot_name,
      slot.character_data.name,
      JSON.stringify(slot.character_data),
      slot.role
    );
    console.log(`   Created slot: ${slot.slot_name} (${slot.role})`);
  }

  // Create ship
  console.log('\n3. Creating ship: Kimbly...');
  const shipId = generateId();
  db.prepare(`
    INSERT INTO ships (id, campaign_id, name, template_id, ship_data, visible_to_players, is_party_ship, current_state)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    shipId,
    campaignId,
    SHIP.name,
    SHIP.template_id,
    JSON.stringify(SHIP.ship_data),
    1,  // visible
    1,  // party ship
    JSON.stringify(SHIP.current_state)
  );
  console.log(`   Created: ${SHIP.name} (${shipId})`);

  // Assign default ship to all players
  console.log('\n3b. Assigning default ship to players...');
  const updatePlayerShip = db.prepare(`UPDATE player_accounts SET ship_id = ? WHERE id = ?`);
  for (const playerId of playerIds) {
    updatePlayerShip.run(shipId, playerId);
  }
  console.log(`   All players assigned to ${SHIP.name}`);

  // Create NPC crew
  console.log('\n4. Creating NPC crew...');
  const insertNPC = db.prepare(`
    INSERT INTO npc_crew (id, ship_id, name, role, skill_level, personality, is_ai)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const npc of NPC_CREW) {
    const npcId = generateId();
    insertNPC.run(npcId, shipId, npc.name, npc.role, npc.skill_level, npc.personality, npc.is_ai);
    console.log(`   Created NPC: ${npc.name} (${npc.role})`);
  }

  // Create contacts
  console.log('\n5. Creating sensor contacts...');
  const insertContact = db.prepare(`
    INSERT INTO contacts (id, campaign_id, name, type, bearing, range_km, range_band, transponder, signature, visible_to, gm_notes, is_targetable, weapons_free, health, max_health, uwp, celestial, stellar_class, trade_codes, wiki_url, captain_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const contact of CONTACTS) {
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
      contact.wikiUrl || null,
      contact.captain_name || null
    );
    console.log(`   Created contact: ${contact.transponder || contact.name} (${contact.type})`);
  }

  // Create log entries
  console.log('\n6. Creating ship log entries...');
  const insertLog = db.prepare(`
    INSERT INTO ship_log (ship_id, campaign_id, timestamp, game_date, entry_type, message, actor)
    VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?)
  `);

  for (const entry of LOG_ENTRIES) {
    insertLog.run(shipId, campaignId, entry.game_date, entry.entry_type, entry.message, entry.actor);
    console.log(`   Log: [${entry.entry_type}] ${entry.message.substring(0, 40)}...`);
  }

  // Build a map of player slot_name -> player_id for contact visibility
  const playerSlotMap = {};
  const playerSlots = db.prepare('SELECT id, slot_name FROM player_accounts WHERE campaign_id = ?').all(campaignId);
  for (const slot of playerSlots) {
    playerSlotMap[slot.slot_name] = slot.id;
  }

  // Create NPC contacts
  console.log('\n7. Creating NPC contacts...');
  const insertNPCContact = db.prepare(`
    INSERT INTO npc_contacts (id, campaign_id, name, title, location, description, loyalty, visible_to, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const contact of NPC_CONTACTS) {
    const contactId = generateId();
    // Convert slot names to player IDs for visibility
    let visibleTo = contact.visibleTo;
    if (!visibleTo.includes('all')) {
      visibleTo = contact.visibleTo.map(slotName => playerSlotMap[slotName]).filter(id => id);
    }
    insertNPCContact.run(
      contactId,
      campaignId,
      contact.name,
      contact.title,
      contact.location,
      contact.description,
      contact.loyalty,
      JSON.stringify(visibleTo),
      contact.notes
    );
    console.log(`   Created NPC contact: ${contact.name} (${contact.visibleTo.join(', ')})`);
  }

  // Create welcome emails
  console.log('\n8. Creating welcome emails...');
  const insertMail = db.prepare(`
    INSERT INTO mail (id, campaign_id, sender_name, sender_type, recipient_id, recipient_type, subject, body, sent_date, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const email of WELCOME_EMAILS) {
    const mailId = generateId();
    let recipientId = null;
    let recipientType = 'player';

    if (email.recipientSlot === 'all') {
      recipientType = 'all';
    } else {
      recipientId = playerSlotMap[email.recipientSlot];
    }

    insertMail.run(
      mailId,
      campaignId,
      email.senderName,
      'npc',
      recipientId,
      recipientType,
      email.subject,
      email.body,
      CAMPAIGN.current_date,  // Sent on arrival at Dorannia
      email.priority
    );
    console.log(`   Created email: "${email.subject}" → ${email.recipientSlot}`);
  }

  // Summary
  console.log('\n========================================');
  console.log('SEEDING COMPLETE');
  console.log('========================================');
  console.log(`Campaign: ${CAMPAIGN.name}`);
  console.log(`Campaign ID: ${campaignId}`);
  console.log(`GM: ${CAMPAIGN.gm_name}`);
  console.log(`Date: ${CAMPAIGN.current_date}`);
  console.log(`Location: ${CAMPAIGN.current_system}`);
  console.log(`Ship: ${SHIP.name}`);
  console.log(`Players: ${PLAYER_SLOTS.length} slots`);
  console.log(`NPC Crew: ${NPC_CREW.length}`);
  console.log(`Sensor Contacts: ${CONTACTS.length}`);
  console.log(`NPC Contacts: ${NPC_CONTACTS.length}`);
  console.log(`Welcome Emails: ${WELCOME_EMAILS.length}`);
  console.log(`Log entries: ${LOG_ENTRIES.length}`);
  console.log('========================================');
  console.log('\nTo test:');
  console.log('1. Open http://localhost:3000/operations/');
  console.log('2. Click "GM Login"');
  console.log(`3. Select "${CAMPAIGN.name}" campaign`);
  console.log('========================================');

  return campaignId;
}

// Run if called directly
if (require.main === module) {
  seedDoranniaCampaign();
}

module.exports = { seedDoranniaCampaign, CAMPAIGN, PLAYER_SLOTS, SHIP, CONTACTS, NPC_CONTACTS, WELCOME_EMAILS };
