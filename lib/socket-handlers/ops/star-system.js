/**
 * AR-29.5: Star System Socket Handlers
 * Handles: getStarSystem, saveStarSystem, regenerateStarSystem, shareStarSystem
 */

const starSystems = require('../../operations/star-systems');
const systemCache = require('../../operations/system-cache');

/**
 * Register star system handlers
 * @param {Object} ctx - Shared context from context.js
 */
function register(ctx) {
  const { socket, io, opsSession, socketLog, sanitizeError } = ctx;

  // Get star system data (generates if not cached)
  socket.on('ops:getStarSystem', async (data) => {
    try {
      let { sector, hex, name } = data || {};
      socketLog.info(`[OPS] getStarSystem request: name=${name}, sector=${sector}, hex=${hex}`);

      // AR-224: Support name-based lookups when hex isn't provided
      if (!hex && name) {
        const starSystemLoader = require('../../operations/star-system-loader');
        const systemInfo = starSystemLoader.getSystemByName(name);
        if (systemInfo) {
          sector = systemInfo.sector || sector || 'Spinward Marches';
          hex = systemInfo.hex;
          socketLog.info(`[OPS] getStarSystem resolved: sector=${sector}, hex=${hex}`);
        } else {
          socketLog.warn(`[OPS] getStarSystem: could not resolve name "${name}"`);
        }
      }

      if (!sector || !hex) {
        socketLog.warn(`[OPS] getStarSystem: missing sector/hex after resolution`);
        socket.emit('ops:starSystemData', { error: 'Sector and hex required' });
        return;
      }

      // Check if we have a generated system cached
      let system = starSystems.getGeneratedSystem(sector, hex);

      if (!system) {
        // Get base data from system_cache (TravellerMap data)
        const cached = systemCache.getCachedSystem(sector, hex);
        const name = cached?.name || `System ${hex}`;
        const uwp = cached?.uwp || 'X000000-0';
        const stellarClass = cached?.stellar || 'G2 V';

        // Generate the system
        const systemData = generateStarSystem(name, uwp, stellarClass, hex);

        // Save to database
        starSystems.saveGeneratedSystem(sector, hex, systemData);

        system = {
          sector,
          hex,
          system_data: systemData
        };
      }

      socket.emit('ops:starSystemData', {
        sector,
        hex,
        system: system.system_data
      });

      socketLog.info(`[OPS] Sent star system: ${sector}:${hex}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('StarSystem', error));
      socketLog.error('[OPS] Error getting star system:', error);
    }
  });

  // GM saves custom modifications to a system
  socket.on('ops:saveStarSystem', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can modify star systems' });
        return;
      }

      const { sector, hex, systemData } = data || {};
      if (!sector || !hex || !systemData) {
        socket.emit('ops:error', { message: 'Sector, hex, and systemData required' });
        return;
      }

      const success = starSystems.saveGeneratedSystem(sector, hex, systemData, {
        modifiedBy: opsSession.playerId || 'GM'
      });

      if (success) {
        socket.emit('ops:starSystemSaved', { sector, hex });
        socketLog.info(`[OPS] GM saved star system: ${sector}:${hex}`);
      } else {
        socket.emit('ops:error', { message: 'Failed to save star system' });
      }
    } catch (error) {
      socket.emit('ops:error', sanitizeError('StarSystem', error));
      socketLog.error('[OPS] Error saving star system:', error);
    }
  });

  // GM regenerates a system (deletes and recreates)
  socket.on('ops:regenerateStarSystem', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can regenerate star systems' });
        return;
      }

      const { sector, hex } = data || {};
      if (!sector || !hex) {
        socket.emit('ops:error', { message: 'Sector and hex required' });
        return;
      }

      // Delete existing
      starSystems.deleteGeneratedSystem(sector, hex);

      // Generate new
      const cached = systemCache.getCachedSystem(sector, hex);
      const name = cached?.name || `System ${hex}`;
      const uwp = cached?.uwp || 'X000000-0';
      const stellarClass = cached?.stellar || 'G2 V';

      const systemData = generateStarSystem(name, uwp, stellarClass, hex);
      starSystems.saveGeneratedSystem(sector, hex, systemData);

      socket.emit('ops:starSystemData', {
        sector,
        hex,
        system: systemData,
        regenerated: true
      });

      socketLog.info(`[OPS] GM regenerated star system: ${sector}:${hex}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('StarSystem', error));
      socketLog.error('[OPS] Error regenerating star system:', error);
    }
  });

  // GM shares star system with all players
  socket.on('ops:shareStarSystem', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can share star systems' });
        return;
      }
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'No campaign selected' });
        return;
      }

      const { sector, hex, system } = data || {};

      // Broadcast to all players in campaign
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:starSystemShared', {
        sector,
        hex,
        system,
        sharedBy: opsSession.playerId
      });

      socketLog.info(`[OPS] Star system shared: ${sector}:${hex}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('StarSystem', error));
      socketLog.error('[OPS] Error sharing star system:', error);
    }
  });

  // AR-144: List available subsector files
  socket.on('ops:listSubsectors', () => {
    try {
      const fs = require('fs');
      const path = require('path');
      const subsectorsDir = path.join(__dirname, '../../../data/subsectors');

      const files = fs.readdirSync(subsectorsDir)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));

      socket.emit('ops:subsectorList', { subsectors: files });
      socketLog.info(`[OPS] Listed ${files.length} subsector files`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Subsectors', error));
      socketLog.error('[OPS] Error listing subsectors:', error);
    }
  });

  // AR-144: Get subsector data by filename
  socket.on('ops:getSubsectorData', (data) => {
    try {
      const { subsector } = data;
      if (!subsector) {
        socket.emit('ops:error', { message: 'Subsector name required' });
        return;
      }

      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../../../data/subsectors', `${subsector}.json`);

      if (!fs.existsSync(filePath)) {
        socket.emit('ops:error', { message: `Subsector file not found: ${subsector}` });
        return;
      }

      const data_ = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      socket.emit('ops:subsectorData', { subsector, data: data_ });
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Subsector', error));
      socketLog.error('[OPS] Error loading subsector:', error);
    }
  });
}

// ==================== Procedural Generation (Server-side) ====================

/**
 * Seeded random number generator
 */
function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Generate a star system from UWP and stellar data
 */
function generateStarSystem(name, uwp = 'X000000-0', stellarClass = 'G2 V', hex = '0000') {
  const seed = parseInt(hex, 16) || 12345;
  const rng = seededRandom(seed);

  // Parse stellar class
  const stars = parseStars(stellarClass, rng);

  // Parse UWP
  const mainworldSize = parseInt(uwp[1], 16) || 5;
  const mainworldAtmo = parseInt(uwp[2], 16) || 5;
  const mainworldHydro = parseInt(uwp[3], 16) || 5;

  // Generate planets
  const planets = generatePlanets(rng, stars[0], mainworldSize, mainworldAtmo, mainworldHydro);

  // Asteroid belt (30% chance)
  const asteroidBelts = [];
  if (rng() < 0.3) {
    const beltAU = 2.0 + rng() * 2.0;
    asteroidBelts.push({
      innerRadius: beltAU * 0.8,
      outerRadius: beltAU * 1.2,
      density: 0.3 + rng() * 0.4
    });
  }

  return {
    name,
    uwp,
    stellarClass,
    hex,
    stars,
    planets,
    asteroidBelts,
    generated: true,
    generatedAt: new Date().toISOString()
  };
}

function parseStars(stellarClass, rng) {
  const stars = [];
  const parts = stellarClass.split(/\s+/);

  const primary = parts[0] || 'G2';
  const luminosity = parts[1] || 'V';

  stars.push({
    type: primary[0] || 'G',
    subtype: parseInt(primary.slice(1)) || 2,
    luminosity,
    radius: getStarRadius(primary[0], luminosity),
    position: { x: 0, y: 0 }
  });

  // Binary/trinary
  if (parts.length > 2 || stellarClass.includes('+')) {
    const secondaryType = parts[2]?.[0] || (rng() < 0.5 ? 'K' : 'M');
    stars.push({
      type: secondaryType,
      subtype: Math.floor(rng() * 9),
      luminosity: 'V',
      radius: getStarRadius(secondaryType, 'V') * 0.8,
      position: { x: 0.5, y: 0.3 }
    });
  }

  // Check for third star
  if (parts.length > 3) {
    const tertiaryType = parts[3]?.[0] || 'M';
    stars.push({
      type: tertiaryType,
      subtype: Math.floor(rng() * 9),
      luminosity: 'V',
      radius: getStarRadius(tertiaryType, 'V') * 0.6,
      position: { x: -0.4, y: -0.2 }
    });
  }

  return stars;
}

function getStarRadius(type, luminosity) {
  const baseRadius = { O: 15, B: 8, A: 2.5, F: 1.4, G: 1.0, K: 0.8, M: 0.5, L: 0.2, T: 0.1, D: 0.01 };
  const lumMultiplier = { Ia: 100, Ib: 50, II: 25, III: 10, IV: 3, V: 1, VI: 0.5, D: 0.01 };
  return (baseRadius[type] || 1) * (lumMultiplier[luminosity] || 1);
}

function getHabitableZone(starType) {
  const zones = {
    O: { inner: 50, outer: 200 },
    B: { inner: 10, outer: 50 },
    A: { inner: 2, outer: 5 },
    F: { inner: 1.2, outer: 2.5 },
    G: { inner: 0.9, outer: 1.5 },
    K: { inner: 0.5, outer: 0.9 },
    M: { inner: 0.1, outer: 0.4 }
  };
  return zones[starType] || zones.G;
}

function generatePlanets(rng, primaryStar, mainSize, mainAtmo, mainHydro) {
  const planets = [];
  const planetCount = 3 + Math.floor(rng() * 6);
  const habZone = getHabitableZone(primaryStar.type);

  const mainworldAU = (mainAtmo >= 4 && mainAtmo <= 9)
    ? habZone.inner + rng() * (habZone.outer - habZone.inner)
    : 0.3 + rng() * 0.7;

  const orbits = generateOrbits(rng, planetCount, mainworldAU);

  for (let i = 0; i < planetCount; i++) {
    const au = orbits[i];
    const isMainworld = Math.abs(au - mainworldAU) < 0.1;

    let type, size;
    if (isMainworld) {
      type = mainAtmo >= 4 && mainAtmo <= 9 ? 'habitable' : 'rocky';
      size = 2000 + mainSize * 1000;
    } else if (au > 3.0) {
      type = rng() < 0.6 ? 'gas' : 'ice';
      size = type === 'gas' ? 30000 + rng() * 100000 : 5000 + rng() * 15000;
    } else {
      type = 'rocky';
      size = 2000 + rng() * 8000;
    }

    const planet = {
      id: `planet_${i}`,
      name: isMainworld ? 'Mainworld' : `Planet ${i + 1}`,
      type,
      orbitAU: au,
      orbitPeriod: Math.sqrt(au * au * au) * 365,
      size,
      isMainworld,
      hasRings: type === 'gas' && rng() < 0.4,
      moons: []
    };

    if (size > 10000) {
      const moonCount = Math.floor(rng() * 5);
      for (let m = 0; m < moonCount; m++) {
        planet.moons.push({
          id: `moon_${i}_${m}`,
          name: `${planet.name} ${String.fromCharCode(97 + m)}`,
          size: 500 + rng() * 3000,
          orbitRadius: (m + 1) * 50000 + rng() * 100000
        });
      }
    }

    planets.push(planet);
  }

  return planets.sort((a, b) => a.orbitAU - b.orbitAU);
}

function generateOrbits(rng, count, mainworldAU) {
  const orbits = [mainworldAU];
  let au = 0.2;
  for (let i = 0; i < count - 1; i++) {
    au = au * (1.4 + rng() * 0.6);
    if (Math.abs(au - mainworldAU) > 0.2) {
      orbits.push(au);
    }
  }
  return orbits.slice(0, count).sort((a, b) => a - b);
}

module.exports = { register };
