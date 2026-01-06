/**
 * AR-40: Library Computer - Static Reference Data
 * Searchable Traveller reference database
 */

// Trade codes and their meanings
const TRADE_CODES = {
  Ag: { name: 'Agricultural', desc: 'Dedicated to farming and food production. Good source of foodstuffs.' },
  As: { name: 'Asteroid', desc: 'Planetoid belt or small worldlet. Often mining operations.' },
  Ba: { name: 'Barren', desc: 'Uncolonized, no permanent population.' },
  De: { name: 'Desert', desc: 'Little or no water, may have life adapted to dry conditions.' },
  Fl: { name: 'Fluid Oceans', desc: 'Surface liquid is not water (ammonia, hydrocarbons).' },
  Ga: { name: 'Garden', desc: 'Earth-like world, comfortable for humans.' },
  Hi: { name: 'High Population', desc: 'Population in billions. Major market and labor pool.' },
  Ht: { name: 'High Technology', desc: 'TL 12+. Source of advanced goods.' },
  IC: { name: 'Ice-Capped', desc: 'Significant ice coverage, may have liquid water elsewhere.' },
  In: { name: 'Industrial', desc: 'Major manufacturing center. Source of manufactured goods.' },
  Lo: { name: 'Low Population', desc: 'Population under 10,000. Limited services.' },
  Lt: { name: 'Low Technology', desc: 'TL 5 or less. Pre-industrial society.' },
  Na: { name: 'Non-Agricultural', desc: 'Unable to produce food locally. Must import.' },
  NI: { name: 'Non-Industrial', desc: 'Limited manufacturing capability.' },
  Po: { name: 'Poor', desc: 'Limited resources, economic difficulties.' },
  Ri: { name: 'Rich', desc: 'Wealthy world with high standard of living.' },
  Va: { name: 'Vacuum', desc: 'No atmosphere. Requires sealed environments.' },
  Wa: { name: 'Water World', desc: '90%+ water coverage. Limited land.' }
};

// Starport classifications
const STARPORT_CLASSES = {
  A: { name: 'Excellent', desc: 'Full shipyard, refined fuel, all repairs. Best facilities.', fuel: 'Refined', repair: 'All', shipyard: 'Full' },
  B: { name: 'Good', desc: 'Spacecraft shipyard, refined fuel, most repairs.', fuel: 'Refined', repair: 'Most', shipyard: 'Spacecraft' },
  C: { name: 'Routine', desc: 'Small craft yard, unrefined fuel, basic repairs.', fuel: 'Unrefined', repair: 'Basic', shipyard: 'Small craft' },
  D: { name: 'Poor', desc: 'No shipyard, unrefined fuel, minimal repairs.', fuel: 'Unrefined', repair: 'Minimal', shipyard: 'None' },
  E: { name: 'Frontier', desc: 'No facilities, no fuel, no repairs. Landing area only.', fuel: 'None', repair: 'None', shipyard: 'None' },
  X: { name: 'No Starport', desc: 'No designated landing area. Completely undeveloped.', fuel: 'None', repair: 'None', shipyard: 'None' }
};

// UWP digit meanings
const UWP_REFERENCE = {
  size: {
    0: 'Asteroid/Planetoid Belt (<800km)',
    1: '1,600km (e.g. Triton)',
    2: '3,200km (e.g. Luna)',
    3: '4,800km (e.g. Mars)',
    4: '6,400km',
    5: '8,000km',
    6: '9,600km',
    7: '11,200km',
    8: '12,800km (e.g. Earth)',
    9: '14,400km',
    A: '16,000km+'
  },
  atmosphere: {
    0: 'None - Vacuum',
    1: 'Trace',
    2: 'Very Thin, Tainted',
    3: 'Very Thin',
    4: 'Thin, Tainted',
    5: 'Thin',
    6: 'Standard',
    7: 'Standard, Tainted',
    8: 'Dense',
    9: 'Dense, Tainted',
    A: 'Exotic',
    B: 'Corrosive',
    C: 'Insidious',
    D: 'Dense, High',
    E: 'Thin, Low',
    F: 'Unusual'
  },
  hydrographics: {
    0: '0-5% water (Desert)',
    1: '6-15%',
    2: '16-25%',
    3: '26-35%',
    4: '36-45%',
    5: '46-55%',
    6: '56-65%',
    7: '66-75% (Earth-like)',
    8: '76-85%',
    9: '86-95%',
    A: '96-100% (Water world)'
  },
  population: {
    0: '0 (None)',
    1: '1-9 (Tens)',
    2: '10-99 (Hundreds)',
    3: '100-999 (Thousands)',
    4: '1,000-9,999 (Ten thousands)',
    5: '10,000-99,999 (Hundred thousands)',
    6: '100,000-999,999 (Millions)',
    7: '1M-9.9M (Low millions)',
    8: '10M-99M (Tens of millions)',
    9: '100M-999M (Hundreds of millions)',
    A: '1B-9.9B (Billions)',
    B: '10B-99B (Tens of billions)',
    C: '100B+ (Hundreds of billions)'
  },
  government: {
    0: 'None/Anarchy',
    1: 'Company/Corporation',
    2: 'Participating Democracy',
    3: 'Self-Perpetuating Oligarchy',
    4: 'Representative Democracy',
    5: 'Feudal Technocracy',
    6: 'Captive Government',
    7: 'Balkanization',
    8: 'Civil Service Bureaucracy',
    9: 'Impersonal Bureaucracy',
    A: 'Charismatic Dictator',
    B: 'Non-Charismatic Leader',
    C: 'Charismatic Oligarchy',
    D: 'Religious Dictatorship',
    E: 'Religious Autocracy',
    F: 'Totalitarian Oligarchy'
  },
  lawLevel: {
    0: 'No prohibitions',
    1: 'Body pistols, explosives, poison gas prohibited',
    2: 'Portable energy weapons prohibited',
    3: 'Military weapons prohibited',
    4: 'Light assault weapons prohibited',
    5: 'Personal concealable weapons prohibited',
    6: 'All firearms except shotguns prohibited',
    7: 'Shotguns prohibited',
    8: 'Blade weapons controlled',
    9: 'All weapons prohibited outside home'
  },
  techLevel: {
    0: 'Stone Age (primitive)',
    1: 'Bronze/Iron Age',
    2: 'Renaissance',
    3: 'Industrial Revolution',
    4: 'Mechanization',
    5: 'Broadcast Communications',
    6: 'Nuclear Power',
    7: 'Miniaturized Electronics',
    8: 'Quality Computers',
    9: 'Anti-gravity, Fusion Power',
    A: '(10) Jump Drive possible',
    B: '(11) Large starships',
    C: '(12) Sophisticated robots',
    D: '(13) Cloning, personal energy weapons',
    E: '(14) Fusion guns',
    F: '(15) Black globe generators'
  }
};

// Common Traveller terms
const GLOSSARY = {
  'Jump': 'Faster-than-light travel through jumpspace. Takes approximately one week regardless of distance (1-6 parsecs).',
  'Parsec': 'Unit of stellar distance, about 3.26 light years. Jump drives are rated in parsecs.',
  'Credits': 'Standard Imperial currency. Abbreviated Cr.',
  'Sophont': 'Any intelligent species capable of civilization.',
  'Vargr': 'Wolf-descended sophonts from Lair. Known for charismatic leaders and pack mentality.',
  'Aslan': 'Lion-like sophonts. Territorial, with strict gender roles. Honourable warriors.',
  'Zhodani': 'Human subspecies with psionic abilities. Use thought police (Tavrchedl).',
  'Imperium': 'The Third Imperium, dominant human government spanning thousands of worlds.',
  'Scout Service': 'IISS (Imperial Interstellar Scout Service). Exploration and courier duties.',
  'Navy': 'Imperial Navy. Defends Imperium, patrols space lanes.',
  'Marines': 'Imperial Marines. Shipboard troops and ground assault.',
  'Merchants': 'Free traders and megacorporation traders moving goods between worlds.',
  'Subsector': 'Political/administrative unit of 40 star systems in an 8x10 parsec grid.',
  'Sector': 'Larger unit of 16 subsectors, 32x40 parsecs.',
  'Gas Giant': 'Large planet (like Jupiter) where starships can skim fuel.',
  'Fuel Skimming': 'Process of gathering hydrogen from gas giant atmospheres.',
  'Unrefined Fuel': 'Raw hydrogen from gas giants or water. Requires processing or risks misjump.',
  'Refined Fuel': 'Processed hydrogen safe for jump drives. More expensive.',
  'Misjump': 'Jump gone wrong. Can result in damage, wrong destination, or destruction.',
  'Maneuver Drive': 'M-Drive. Provides thrust in normal space.',
  'Power Plant': 'Ship reactor providing energy for all systems.',
  'Hardpoint': 'Weapon mounting point on a ship, one per 100 tons.',
  'Turret': 'Weapon housing mounted on a hardpoint. Can hold up to 3 weapons.',
  'Bay': 'Larger weapon system using 50+ tons.',
  'Transponder': 'Device broadcasting ship identity. Required by law.',
  'Tonnage': 'Ship size measured in displacement tons (14 cubic meters each).',
  'Bridge': 'Ship command center. Size varies with ship tonnage.',
  'Stateroom': 'Personal quarters for crew or passengers. 4 tons each.',
  'Low Berth': 'Cryogenic pod for frozen passengers. Risky but cheap.',
  'Vacc Suit': 'Vacuum suit for survival in space or hostile atmospheres.',
  'Battle Dress': 'Powered armor. Military-grade protection and strength enhancement.',
  'Grav Belt': 'Personal anti-gravity device for flight.',

  // AR-269: Combat and Weapons
  'Pulse Laser': 'Rapid-fire laser weapon. Good against small targets. 2D damage per hit.',
  'Beam Laser': 'Sustained beam laser. Higher damage but harder to aim. 1D+4 damage.',
  'Missile Rack': 'Guided missile launcher. Smart or standard missiles available.',
  'Sandcaster': 'Defensive system launching sand particles to absorb laser fire.',
  'Particle Beam': 'High-energy particle accelerator. Ignores some armor. Radiation danger.',
  'Meson Gun': 'Advanced weapon firing mesons that pass through matter. Bay or spinal mount only.',
  'Nuclear Damper': 'Suppresses nuclear reactions, disabling missiles and reactors.',
  'Point Defence': 'Automated system targeting incoming missiles and small craft.',
  'Range Band': 'Combat distance category: Adjacent, Close, Short, Medium, Long, Very Long, Distant.',
  'Evasive Maneuvers': 'Pilot action making ship harder to hit at cost of attack accuracy.',

  // AR-269: Navigation and Systems
  'Brachistochrone': 'Fastest path between two points using constant acceleration then deceleration.',
  'Astrogation': 'Art of plotting jump courses. Errors can cause misjump.',
  'Jump Masking': 'Using a planet or star to hide jump signature from sensors.',
  'Fuel Purifier': 'Processes unrefined fuel to reduce misjump risk.',
  'Solar Sail': 'Slow but fuel-free propulsion using stellar radiation pressure.',
  'Sensors': 'Detection systems: Basic, Civilian, Military, or Advanced. Affects scan range.',
  'Signature': 'Ship detectability. Affected by size, power output, and emissions.',
  'ECM': 'Electronic countermeasures. Reduces enemy targeting accuracy.',

  // AR-269: Crew and Roles
  'Pilot': 'Flies the ship. Handles takeoff, landing, and combat maneuvers.',
  'Astrogator': 'Plots jump courses. Critical for safe interstellar travel.',
  'Engineer': 'Maintains drives, power plant. Handles damage control.',
  'Gunner': 'Operates ship weapons. One per turret or bay.',
  'Medic': 'Provides medical care. Critical for recovery from wounds.',
  'Steward': 'Handles passengers, provisions. Affects high passage income.',

  // AR-269: Political
  'Spinward Marches': 'Frontier sector at edge of Imperium, bordering Zhodani Consulate.',
  'Zhodani Consulate': 'Psionic human civilization. Historic enemy of the Imperium.',
  'Sword Worlds': 'Independent human confederation. Cultural ties to Old Earth Scandinavia.',
  'Vargr Extents': 'Chaotic region of Vargr pocket empires and alliances.',
  'Regina': 'Capital of Regina subsector. Major Imperial naval base.',
  'Rhylanor': 'Major trade hub in Spinward Marches. High-tech world.',
  'Traveller Aid Society': 'TAS. Organization providing services to travellers. Membership prestigious.'
};

// Search the library
function searchLibrary(query) {
  if (!query || query.length < 2) return [];

  const results = [];
  const q = query.toLowerCase();

  // Search trade codes
  for (const [code, data] of Object.entries(TRADE_CODES)) {
    if (code.toLowerCase().includes(q) || data.name.toLowerCase().includes(q) || data.desc.toLowerCase().includes(q)) {
      results.push({ type: 'trade_code', code, ...data });
    }
  }

  // Search starports
  for (const [code, data] of Object.entries(STARPORT_CLASSES)) {
    if (code.toLowerCase() === q || data.name.toLowerCase().includes(q) || data.desc.toLowerCase().includes(q)) {
      results.push({ type: 'starport', code, ...data });
    }
  }

  // Search glossary
  for (const [term, desc] of Object.entries(GLOSSARY)) {
    if (term.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) {
      results.push({ type: 'glossary', term, desc });
    }
  }

  return results.slice(0, 20);
}

// Decode UWP string
function decodeUWP(uwp) {
  if (!uwp || uwp.length < 8) return null;

  const chars = uwp.toUpperCase().replace(/-/g, '');
  const starport = chars[0];
  const size = chars[1];
  const atmo = chars[2];
  const hydro = chars[3];
  const pop = chars[4];
  const gov = chars[5];
  const law = chars[6];
  const tech = chars[7] || '?';

  return {
    uwp,
    starport: { code: starport, ...STARPORT_CLASSES[starport] },
    size: { code: size, desc: UWP_REFERENCE.size[size] || 'Unknown' },
    atmosphere: { code: atmo, desc: UWP_REFERENCE.atmosphere[atmo] || 'Unknown' },
    hydrographics: { code: hydro, desc: UWP_REFERENCE.hydrographics[hydro] || 'Unknown' },
    population: { code: pop, desc: UWP_REFERENCE.population[pop] || 'Unknown' },
    government: { code: gov, desc: UWP_REFERENCE.government[gov] || 'Unknown' },
    lawLevel: { code: law, desc: UWP_REFERENCE.lawLevel[law] || 'Unknown' },
    techLevel: { code: tech, desc: UWP_REFERENCE.techLevel[tech] || 'Unknown' }
  };
}

// Get trade code info
function getTradeCode(code) {
  return TRADE_CODES[code.toUpperCase()] || null;
}

// Get starport info
function getStarport(code) {
  return STARPORT_CLASSES[code.toUpperCase()] || null;
}

// Get glossary term
function getGlossaryTerm(term) {
  const key = Object.keys(GLOSSARY).find(k => k.toLowerCase() === term.toLowerCase());
  return key ? { term: key, desc: GLOSSARY[key] } : null;
}

// Get all trade codes
function getAllTradeCodes() {
  return Object.entries(TRADE_CODES).map(([code, data]) => ({ code, ...data }));
}

// Get all starports
function getAllStarports() {
  return Object.entries(STARPORT_CLASSES).map(([code, data]) => ({ code, ...data }));
}

// Get all glossary terms
function getAllGlossaryTerms() {
  return Object.entries(GLOSSARY).map(([term, desc]) => ({ term, desc }));
}

module.exports = {
  searchLibrary,
  decodeUWP,
  getTradeCode,
  getStarport,
  getGlossaryTerm,
  getAllTradeCodes,
  getAllStarports,
  getAllGlossaryTerms,
  TRADE_CODES,
  STARPORT_CLASSES,
  UWP_REFERENCE,
  GLOSSARY
};
