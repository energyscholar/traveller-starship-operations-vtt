#!/usr/bin/env node
/**
 * Generate star system JSON files from TravellerMap API data
 * AR-65: 5 systems per subsector (excluding already existing ones)
 */

const fs = require('fs');
const path = require('path');

const STAR_SYSTEMS_DIR = path.join(__dirname, '../data/star-systems');

// Systems to generate per subsector (nearest to Flammarion 0930)
const SYSTEMS_TO_GENERATE = {
  // Sword Worlds (J) - already have Flammarion
  'Sword Worlds': [
    { hex: '0927', name: 'Narsil', uwp: 'B574A55-A', tradeCodes: ['Hi', 'In'], allegiance: 'SwCf', bases: ['KM'], stellar: 'G6 IV M0 V' },
    { hex: '0922', name: 'Tizon', uwp: 'B586887-A', tradeCodes: ['Ri', 'Pa', 'Ph'], allegiance: 'SwCf', bases: ['KM'], stellar: 'K2 IV M3 V' },
    { hex: '1022', name: 'Colada', uwp: 'B564685-B', tradeCodes: ['Ag', 'Ni', 'Ri'], allegiance: 'SwCf', bases: ['KM'], stellar: 'K2 V M8 V' },
    { hex: '1026', name: 'Anduril', uwp: 'B985855-B', tradeCodes: ['Ri', 'Pa', 'Ph'], allegiance: 'SwCf', bases: ['KM'], stellar: 'F2 V' }
  ],
  // District 268 (N) - already have Dorannia
  'District 268': [
    { hex: '0931', name: 'Asteltine', uwp: 'B7A7402-A', tradeCodes: ['Fl', 'Ni'], allegiance: 'NaHu', bases: [], stellar: 'K7 V M3 V' },
    { hex: '1031', name: '567-908', uwp: 'E532000-0', tradeCodes: ['Ba', 'Po'], allegiance: 'NaXX', bases: [], stellar: 'K5 III D', notes: 'Barren world. Shriekers native lifeform.' },
    { hex: '1132', name: 'Bowman', uwp: 'D000300-9', tradeCodes: ['As', 'Lo', 'Va'], allegiance: 'CsIm', bases: ['S'], stellar: 'M0 V' },
    { hex: '1237', name: 'Collace', uwp: 'B628943-D', tradeCodes: ['Hi', 'In', 'Ht'], allegiance: 'CsIm', bases: ['S'], stellar: 'F1 V M3 V' }
  ],
  // Darrian (I) - already have Ator
  'Darrian': [
    { hex: '0527', name: 'Mire', uwp: 'A665A95-C', tradeCodes: ['Hi', 'Ga', 'Cx', 'Ht'], allegiance: 'DaCf', bases: ['KM'], stellar: 'K6 V' },
    { hex: '0427', name: 'Roget', uwp: 'B566777-9', tradeCodes: ['Ag', 'Ri'], allegiance: 'DaCf', bases: [], stellar: 'F8 V M3 V' },
    { hex: '0430', name: 'Bularia', uwp: 'C774622-5', tradeCodes: ['Ag', 'Ni', 'Lt'], allegiance: 'CsIm', bases: [], stellar: 'K5 V M3 V' },
    { hex: '0426', name: 'Ilium', uwp: 'B544831-9', tradeCodes: ['Pa', 'Ph', 'Pi'], allegiance: 'DaCf', bases: ['KM'], stellar: 'G3 V M8 V' }
  ],
  // Five Sisters (M) - no existing systems
  'Five Sisters': [
    { hex: '0333', name: 'Mirriam', uwp: 'B9998A6-A', tradeCodes: ['Ph', 'Pi', 'Pz'], allegiance: 'ImDd', bases: ['NW'], stellar: 'G6 V' },
    { hex: '0534', name: 'Karin', uwp: 'A767768-C', tradeCodes: ['Ag', 'Ga', 'Ri', 'Ht'], allegiance: 'ImDd', bases: ['NS'], stellar: 'G7 V' },
    { hex: '0133', name: 'Emape', uwp: 'B564500-B', tradeCodes: ['Ag', 'Ni', 'Pr'], allegiance: 'ImDd', bases: ['N'], stellar: 'M0 V' },
    { hex: '0139', name: 'Raweh', uwp: 'B430300-B', tradeCodes: ['De', 'Lo', 'Po'], allegiance: 'ImDd', bases: ['N'], stellar: 'G3 V M1 V' },
    { hex: '0538', name: 'Wonstar', uwp: 'B555741-7', tradeCodes: ['Ag', 'Pz'], allegiance: 'ImDd', bases: ['N'], stellar: 'M0 V' }
  ]
};

// UWP parsing
function parseUWP(uwp) {
  const chars = uwp.split('');
  const hexToNum = c => parseInt(c, 16) || 0;
  return {
    starport: chars[0],
    size: hexToNum(chars[1]),
    atmosphere: hexToNum(chars[2]),
    hydrographics: hexToNum(chars[3]),
    population: hexToNum(chars[4]),
    government: hexToNum(chars[5]),
    lawLevel: hexToNum(chars[6]),
    techLevel: hexToNum(chars[8] || '0')
  };
}

function getAtmosphereDesc(atmo) {
  const types = ['None', 'Trace', 'Very Thin Tainted', 'Very Thin', 'Thin Tainted', 'Thin', 'Standard', 'Standard Tainted', 'Dense', 'Dense Tainted', 'Exotic', 'Corrosive', 'Insidious', 'Dense High', 'Thin Low', 'Unusual'];
  return types[atmo] || 'Unknown';
}

function getStarportClass(port) {
  const classes = { A: 'Excellent', B: 'Good', C: 'Routine', D: 'Poor', E: 'Frontier', X: 'None' };
  return classes[port] || 'Unknown';
}

function generateSystemJSON(systemData, subsector) {
  const uwp = parseUWP(systemData.uwp);
  const id = systemData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

  // Determine if gas giants likely (most systems have them)
  const hasGasGiants = !systemData.tradeCodes.includes('Ba') && Math.random() > 0.3;
  const gasGiants = hasGasGiants ? Math.floor(Math.random() * 3) + 1 : 0;

  const system = {
    id,
    name: systemData.name,
    sector: 'Spinward Marches',
    subsector,
    hex: systemData.hex,
    uwp: systemData.uwp,
    tradeCodes: systemData.tradeCodes,
    allegiance: systemData.allegiance,
    bases: systemData.bases,
    stellar: {
      primary: systemData.stellar.split(' ')[0] + ' ' + systemData.stellar.split(' ')[1],
      type: systemData.stellar.includes(' ') && systemData.stellar.split(' ').length > 2 ? 'Binary' : 'Single'
    },
    worlds: 6 + Math.floor(Math.random() * 8),
    gasGiants,
    planetoidBelts: Math.floor(Math.random() * 2),
    notes: systemData.notes || `${getStarportClass(uwp.starport)} starport. TL${uwp.techLevel}.`,

    celestialObjects: [
      {
        id: `${id}-star`,
        name: `${systemData.name} Primary`,
        type: 'Star',
        orbitAU: 0,
        bearing: 0,
        stellarClass: systemData.stellar.split(' ').slice(0, 2).join(' '),
        transponder: 'NONE',
        gmNotes: `${systemData.stellar} primary star.`
      },
      {
        id: `${id}-mainworld`,
        name: systemData.name,
        type: 'Planet',
        orbitAU: 1.0 + Math.random() * 0.5,
        bearing: Math.floor(Math.random() * 360),
        uwp: systemData.uwp,
        tradeCodes: systemData.tradeCodes,
        atmosphere: getAtmosphereDesc(uwp.atmosphere),
        breathable: uwp.atmosphere >= 5 && uwp.atmosphere <= 8,
        inGoldilocks: uwp.atmosphere >= 2 && uwp.atmosphere <= 9,
        transponder: `${systemData.name.toUpperCase()} CONTROL`,
        gmNotes: `Mainworld. Pop ${uwp.population > 0 ? '10^' + uwp.population : '0'}. TL${uwp.techLevel}.`
      }
    ],

    locations: [
      {
        id: 'loc-exit-jump',
        name: 'Exit Jump Space',
        type: 'jump_point',
        x: 100,
        y: 300,
        actions: ['scan', 'plot_course']
      },
      {
        id: 'loc-system-jump',
        name: 'System Departure Jump Point',
        type: 'jump_point',
        linkedTo: `${id}-star`,
        x: 50,
        y: 150,
        actions: ['jump', 'scan'],
        travelTimeHours: { 'loc-exit-jump': 6, 'loc-mainworld-jump': 8 }
      },
      {
        id: 'loc-mainworld-jump',
        name: 'Mainworld Departure Jump Point',
        type: 'jump_point',
        linkedTo: `${id}-mainworld`,
        x: 500,
        y: 280,
        actions: ['jump', 'scan'],
        travelTimeHours: { 'loc-orbit-mainworld': 4 }
      },
      {
        id: 'loc-orbit-mainworld',
        name: `Orbit - ${systemData.name}`,
        type: 'orbit',
        linkedTo: `${id}-mainworld`,
        x: 450,
        y: 300,
        actions: ['scan', 'launch_craft', 'dock'],
        travelTimeHours: { 'loc-dock-highport': 1, 'loc-mainworld-jump': 4 }
      }
    ],

    roleContent: {
      captain: `Arrived at ${systemData.name}. ${systemData.allegiance} territory.`,
      astrogator: `${systemData.name} reached. Check charts for onward routes.`,
      pilot: `Class ${uwp.starport} port. ${getAtmosphereDesc(uwp.atmosphere)} atmosphere.`,
      engineer: `${getStarportClass(uwp.starport)} facilities. Plan fuel and repairs.`,
      sensors: `System scan complete. Traffic level varies.`,
      gunner: `Local law level ${uwp.lawLevel}. Check weapons regulations.`
    },

    news: [
      {
        headline: `LOCAL NEWS FROM ${systemData.name.toUpperCase()}`,
        source: 'System News Service',
        content: `Standard traffic and operations at ${systemData.name} ${getStarportClass(uwp.starport)} starport.`
      }
    ]
  };

  // Add highport for Class A/B starports
  if (uwp.starport === 'A' || uwp.starport === 'B') {
    system.celestialObjects.push({
      id: `${id}-highport`,
      name: `${systemData.name} Highport`,
      type: 'Station',
      parent: `${id}-mainworld`,
      orbitKm: 400,
      bearing: 268,
      uwp: systemData.uwp,
      transponder: `${systemData.name.toUpperCase()} HIGHPORT`,
      gmNotes: `Class ${uwp.starport} ${getStarportClass(uwp.starport)} starport.`,
      celestial: false
    });

    system.locations.push({
      id: 'loc-dock-highport',
      name: `Dock - ${systemData.name} Highport`,
      type: 'dock',
      linkedTo: `${id}-highport`,
      x: 460,
      y: 310,
      actions: ['refuel_refined', 'repair', 'trade', 'passengers', 'undock'],
      travelTimeHours: { 'loc-orbit-mainworld': 1 }
    });
  } else {
    // Downport only
    system.locations.push({
      id: 'loc-dock-downport',
      name: `Dock - ${systemData.name} Downport`,
      type: 'dock',
      linkedTo: `${id}-mainworld`,
      x: 460,
      y: 310,
      actions: uwp.starport === 'E' || uwp.starport === 'X' ? ['refuel_unrefined', 'undock'] : ['refuel_refined', 'refuel_unrefined', 'repair', 'trade', 'undock'],
      travelTimeHours: { 'loc-orbit-mainworld': 2 }
    });
  }

  // Add gas giant if present
  if (gasGiants > 0) {
    system.celestialObjects.push({
      id: `${id}-gasgiant`,
      name: `${systemData.name} Gas Giant`,
      type: 'Gas Giant',
      orbitAU: 5 + Math.random() * 3,
      bearing: Math.floor(Math.random() * 360),
      transponder: 'NONE',
      gmNotes: 'Gas giant suitable for fuel skimming.'
    });

    system.locations.push({
      id: 'loc-skim-gasgiant',
      name: 'Skim - Gas Giant',
      type: 'skim',
      linkedTo: `${id}-gasgiant`,
      x: 200,
      y: 100,
      actions: ['refuel_skim', 'scan'],
      travelTimeHours: { 'loc-orbit-mainworld': 12, 'loc-system-jump': 10 }
    });
  }

  return system;
}

// Main execution
console.log('AR-65: Generating star system JSON files...\n');

let generated = 0;
const indexUpdates = [];

for (const [subsector, systems] of Object.entries(SYSTEMS_TO_GENERATE)) {
  console.log(`${subsector}:`);

  for (const systemData of systems) {
    const system = generateSystemJSON(systemData, subsector);
    const filename = `${system.id}.json`;
    const filepath = path.join(STAR_SYSTEMS_DIR, filename);

    // Check if file already exists
    if (fs.existsSync(filepath)) {
      console.log(`  - ${system.name} (${system.hex}): SKIPPED (exists)`);
      continue;
    }

    fs.writeFileSync(filepath, JSON.stringify(system, null, 2));
    console.log(`  + ${system.name} (${system.hex}): CREATED`);
    generated++;

    indexUpdates.push({
      id: system.id,
      name: system.name,
      hex: system.hex,
      subsector,
      file: filename
    });
  }
}

console.log(`\nGenerated ${generated} new star system files.`);

if (indexUpdates.length > 0) {
  console.log('\nAdd to _index.json "systems" array:');
  console.log(JSON.stringify(indexUpdates, null, 2));
}
