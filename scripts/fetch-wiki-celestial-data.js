#!/usr/bin/env node
/**
 * Fetch Canonical Celestial Data from Traveller Wiki
 *
 * Politely fetches system data from wiki.travellerrpg.com to get
 * canonical planet/star names for Spinward Marches systems.
 *
 * Features:
 * - 2-second delay between requests (polite)
 * - Resumable (tracks progress in cache file)
 * - Extracts star names, planet names, gas giants, belts
 *
 * Usage:
 *   node scripts/fetch-wiki-celestial-data.js          # Full run
 *   node scripts/fetch-wiki-celestial-data.js --resume # Continue from last
 *   node scripts/fetch-wiki-celestial-data.js --test   # Test with 5 systems
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const DELAY_MS = 2000;  // 2 seconds between requests
const CACHE_FILE = path.join(__dirname, '../data/wiki-cache/spinward-marches-wiki.json');
const SECTOR_FILE = path.join(__dirname, '../data/sectors/spinward-marches.sector');

// Parse arguments
const args = process.argv.slice(2);
const TEST_MODE = args.includes('--test');
const RESUME_MODE = args.includes('--resume');
const TEST_LIMIT = 5;

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'TravellerCombatVTT/1.0 (Educational/Gaming Project)'
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Follow redirect
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode === 404) {
        resolve(null);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function slugify(name) {
  return name.toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ═══════════════════════════════════════════════════════════════════════════
// WIKI PARSING
// ═══════════════════════════════════════════════════════════════════════════

// Words to filter out - common false positives
const FILTER_WORDS = new Set([
  // Common words
  'the', 'and', 'or', 'in', 'on', 'at', 'to', 'of', 'is', 'as', 'it',
  'star', 'system', 'world', 'planet', 'moon', 'belt', 'giant', 'primary',
  'secondary', 'tertiary', 'type', 'class', 'main', 'sequence', 'dwarf',
  'companion', 'orbit', 'its', 'this', 'that', 'with', 'from', 'for',
  'planetoid', 'asteroid', 'gas', 'ice', 'rocky', 'inner', 'outer',
  'red', 'white', 'yellow', 'orange', 'brown', 'blue',
  // Wiki section headers
  'trade', 'data', 'size', 'atmosphere', 'hydrosphere', 'geography',
  'starport', 'technology', 'population', 'government', 'culture',
  'history', 'references', 'sources', 'external', 'links', 'notes',
  'description', 'mainworld', 'native', 'lifeforms', 'sophonts',
  'economy', 'military', 'politics', 'religion', 'language',
  // Traveller terms
  'imperial', 'subsector', 'sector', 'allegiance', 'noble', 'base',
  'naval', 'scout', 'way', 'station', 'highport', 'downport'
]);

function isValidName(name, systemName) {
  if (!name || name.length < 2) return false;
  const lower = name.toLowerCase();
  if (lower === systemName.toLowerCase()) return false;
  if (FILTER_WORDS.has(lower)) return false;
  // Must start with uppercase and be mostly letters
  if (!/^[A-Z][a-z]+$/.test(name) && !/^[A-Z][a-z]+'[a-z]+$/.test(name)) return false;
  return true;
}

function parseWikiPage(html, systemName) {
  const result = {
    hasWikiData: false,
    stars: [],
    celestialObjects: [],
    moons: [],
    rawText: ''
  };

  if (!html) return result;

  // Extract text content (strip HTML)
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ');

  result.rawText = textContent.substring(0, 5000);

  // === STAR PATTERNS ===
  // "Primary Star: Lusor" or "Primary: Dimoph"
  const primaryMatch = textContent.match(/Primary\s*(?:Star)?[:\s]+([A-Z][a-z]+)/);
  if (primaryMatch && isValidName(primaryMatch[1], systemName)) {
    result.stars.push({ name: primaryMatch[1].trim(), role: 'primary' });
    result.hasWikiData = true;
  }

  // "named Dimoph" or "star named Dimoph" (common pattern)
  const namedStarMatch = textContent.match(/(?:primary\s+)?star\s+named\s+([A-Z][a-z]+)/i);
  if (namedStarMatch && isValidName(namedStarMatch[1], systemName) &&
      !result.stars.find(s => s.name === namedStarMatch[1])) {
    result.stars.push({ name: namedStarMatch[1].trim(), role: 'primary' });
    result.hasWikiData = true;
  }

  // "Secondary Star: Speck"
  const secondaryMatch = textContent.match(/Secondary\s*(?:Star)?[:\s]+([A-Z][a-z]+)/);
  if (secondaryMatch && isValidName(secondaryMatch[1], systemName)) {
    result.stars.push({ name: secondaryMatch[1].trim(), role: 'secondary' });
    result.hasWikiData = true;
  }

  // "Tertiary Star: Darida"
  const tertiaryMatch = textContent.match(/Tertiary\s*(?:Star)?[:\s]+([A-Z][a-z]+)/);
  if (tertiaryMatch && isValidName(tertiaryMatch[1], systemName)) {
    result.stars.push({ name: tertiaryMatch[1].trim(), role: 'tertiary' });
    result.hasWikiData = true;
  }

  // === ORBIT TABLE DATA ===
  // Pattern: "1  0.96 AU  Murguil" followed optionally by type
  // More flexible: just look for orbit# + AU + Name
  const orbitPattern = /(\d+)\s+(\d+\.?\d*)\s*AU\s+([A-Z][a-zA-Z']+)/g;
  let match;
  while ((match = orbitPattern.exec(textContent)) !== null) {
    const [fullMatch, orbitNum, distAU, name] = match;
    const cleanName = name.replace(/\s+Belt$/, '').trim();
    if (isValidName(cleanName, systemName) &&
        !result.celestialObjects.find(c => c.name === cleanName)) {
      // Determine type from context (look ahead in text)
      const contextEnd = Math.min(textContent.indexOf(cleanName) + 100, textContent.length);
      const context = textContent.substring(textContent.indexOf(cleanName), contextEnd);
      result.celestialObjects.push({
        orbit: parseInt(orbitNum),
        distanceAU: parseFloat(distAU),
        name: cleanName,
        type: determineType(context, cleanName)
      });
      result.hasWikiData = true;
    }
  }

  // === NAMED GAS GIANTS ===
  // "gas giant named Assiniboia" or "large gas giant Gigig"
  const gasGiantPatterns = [
    /(?:large\s+)?gas\s+giant\s+(?:named\s+)?([A-Z][a-z']+)/gi,
    /(?:named|called)\s+([A-Z][a-z']+).*?gas\s+giant/gi
  ];
  for (const pattern of gasGiantPatterns) {
    pattern.lastIndex = 0;
    while ((match = pattern.exec(textContent)) !== null) {
      const name = match[1].trim();
      if (isValidName(name, systemName) &&
          !result.celestialObjects.find(c => c.name === name)) {
        result.celestialObjects.push({ name, type: 'Gas Giant' });
        result.hasWikiData = true;
      }
    }
  }

  // === NAMED BELTS ===
  // "Guarek Belt" or "planetoid belt named Guarek"
  const beltPatterns = [
    /([A-Z][a-z']+)\s+Belt/g,
    /(?:planetoid|asteroid)\s+belt\s+(?:named\s+)?([A-Z][a-z']+)/gi
  ];
  for (const pattern of beltPatterns) {
    pattern.lastIndex = 0;
    while ((match = pattern.exec(textContent)) !== null) {
      const name = match[1].trim();
      if (isValidName(name, systemName) &&
          !result.celestialObjects.find(c => c.name === name)) {
        result.celestialObjects.push({ name, type: 'Belt' });
        result.hasWikiData = true;
      }
    }
  }

  // === NAMED PLANETS ===
  // More specific patterns to avoid false positives
  const planetPatterns = [
    /(?:inner\s+)?(?:rocky\s+)?(?:world|planet)\s+(?:named\s+)?([A-Z][a-z']+)/gi,
    /([A-Z][a-z']+)\s+is\s+(?:a|an|the)\s+(?:rocky|inner|outer)\s+(?:world|planet)/gi
  ];
  for (const pattern of planetPatterns) {
    pattern.lastIndex = 0;
    while ((match = pattern.exec(textContent)) !== null) {
      const name = match[1].trim();
      if (isValidName(name, systemName) &&
          !result.celestialObjects.find(c => c.name === name)) {
        result.celestialObjects.push({ name, type: 'Planet' });
        result.hasWikiData = true;
      }
    }
  }

  // === MOONS ===
  const moonPatterns = [
    /moon\s+(?:named\s+|called\s+)?([A-Z][a-z']+)/gi,
    /satellite\s+(?:named\s+|called\s+)?([A-Z][a-z']+)/gi,
    /([A-Z][a-z']+)\s+(?:is\s+)?(?:a|an)\s+(?:small\s+)?moon/gi
  ];
  for (const pattern of moonPatterns) {
    pattern.lastIndex = 0;
    while ((match = pattern.exec(textContent)) !== null) {
      const name = match[1].trim();
      if (isValidName(name, systemName) && !result.moons.includes(name)) {
        result.moons.push(name);
        result.hasWikiData = true;
      }
    }
  }

  return result;
}

function determineType(typeStr, name) {
  const lower = typeStr.toLowerCase();
  if (lower.includes('gas giant') || lower.includes('jovian')) return 'Gas Giant';
  if (lower.includes('ice giant')) return 'Ice Giant';
  if (lower.includes('belt') || name.includes('Belt')) return 'Belt';
  if (lower.includes('mainworld') || lower.includes('garden')) return 'Mainworld';
  return 'Planet';
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  WIKI CELESTIAL DATA FETCHER');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode: ${TEST_MODE ? 'TEST (5 systems)' : RESUME_MODE ? 'RESUME' : 'FULL'}`);
  console.log(`  Cache: ${CACHE_FILE}`);
  console.log('');

  // Load sector file to get system list
  console.log('Loading sector file...');
  const sectorData = JSON.parse(fs.readFileSync(SECTOR_FILE, 'utf8'));
  const systems = sectorData.systems.filter(s => s.hex !== '0000'); // Skip jumpspace

  console.log(`Found ${systems.length} systems in Spinward Marches`);

  // Load or initialize cache
  let cache = {
    meta: {
      lastUpdated: new Date().toISOString(),
      systemsProcessed: 0,
      totalSystems: systems.length,
      systemsWithWikiData: 0
    },
    systems: {}
  };

  if (RESUME_MODE && fs.existsSync(CACHE_FILE)) {
    console.log('Loading existing cache for resume...');
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    console.log(`  Previously processed: ${cache.meta.systemsProcessed}`);
  }

  // Determine which systems to process
  const toProcess = systems.filter(s => !cache.systems[s.hex]);
  const limit = TEST_MODE ? Math.min(TEST_LIMIT, toProcess.length) : toProcess.length;

  console.log(`\nSystems to process: ${limit}`);
  console.log(`Estimated time: ${Math.ceil(limit * DELAY_MS / 60000)} minutes`);
  console.log('');

  let processed = 0;
  let withData = 0;

  for (let i = 0; i < limit; i++) {
    const system = toProcess[i];
    const systemName = system.name;
    const hex = system.hex;

    // Try primary URL pattern
    const wikiUrl = `https://wiki.travellerrpg.com/${encodeURIComponent(systemName)}_(world)`;

    process.stdout.write(`[${i + 1}/${limit}] ${systemName} (${hex})... `);

    try {
      const html = await fetchUrl(wikiUrl);

      if (html) {
        const parsed = parseWikiPage(html, systemName);

        cache.systems[hex] = {
          hex,
          name: systemName,
          wikiUrl,
          hasWikiData: parsed.hasWikiData,
          stars: parsed.stars,
          celestialObjects: parsed.celestialObjects,
          moons: parsed.moons,
          fetchedAt: new Date().toISOString()
        };

        if (parsed.hasWikiData) {
          withData++;
          const starNames = parsed.stars.map(s => s.name).join(', ') || 'unnamed';
          console.log(`✓ Found: ${parsed.stars.length} stars (${starNames}), ${parsed.celestialObjects.length} objects`);
        } else {
          console.log('○ Page exists but no celestial data');
        }
      } else {
        cache.systems[hex] = {
          hex,
          name: systemName,
          hasWikiData: false,
          reason: 'No wiki page',
          fetchedAt: new Date().toISOString()
        };
        console.log('✗ No wiki page');
      }

      processed++;
    } catch (err) {
      console.log(`✗ Error: ${err.message}`);
      cache.systems[hex] = {
        hex,
        name: systemName,
        hasWikiData: false,
        reason: `Error: ${err.message}`,
        fetchedAt: new Date().toISOString()
      };
      processed++;
    }

    // Update cache file after each system (for resume capability)
    cache.meta.systemsProcessed = Object.keys(cache.systems).length;
    cache.meta.systemsWithWikiData = Object.values(cache.systems).filter(s => s.hasWikiData).length;
    cache.meta.lastUpdated = new Date().toISOString();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

    // Polite delay
    if (i < limit - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Total processed: ${cache.meta.systemsProcessed}/${cache.meta.totalSystems}`);
  console.log(`  With wiki data: ${cache.meta.systemsWithWikiData}`);
  console.log(`  Cache saved to: ${CACHE_FILE}`);
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
