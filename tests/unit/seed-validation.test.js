/**
 * Seed Script Validation Tests
 *
 * CRITICAL: These tests prevent the SOLODEMO bug from recurring.
 * All seed script campaign IDs MUST be valid UUID v4 format,
 * or the validators will reject them at runtime.
 */

const fs = require('fs');
const path = require('path');

// UUID v4 regex pattern
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractCampaignId(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/CAMPAIGN_ID\s*=\s*['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

describe('Seed Script Campaign IDs', () => {
  const seedDir = path.join(__dirname, '../../lib/operations');

  test('seed-solo-demo.js uses valid UUID v4', () => {
    const id = extractCampaignId(path.join(seedDir, 'seed-solo-demo.js'));
    expect(id).not.toBeNull();
    expect(id).toMatch(UUID_V4_REGEX);
  });

  test('all seed scripts use valid UUID v4 for campaign IDs', () => {
    const seedFiles = fs.readdirSync(seedDir)
      .filter(f => f.startsWith('seed-') && f.endsWith('.js'));

    for (const file of seedFiles) {
      const filePath = path.join(seedDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Find any hardcoded campaign IDs (not using generateId())
      const idMatches = content.matchAll(/(?:campaign|CAMPAIGN).*?[iI]d['":\s]*=?\s*['"]([^'"]+)['"]/g);

      for (const match of idMatches) {
        const id = match[1];
        // Skip if it's a variable reference or generateId call
        if (id.includes('(') || id.includes('$') || id === 'id') continue;

        // Must be valid UUID
        if (!UUID_V4_REGEX.test(id)) {
          throw new Error(
            `${file}: Campaign ID "${id}" is not a valid UUID v4.\n` +
            `All campaign IDs must pass validator checks.\n` +
            `Use generateId() or a valid UUID like: 50100e00-de00-4000-8000-000000000001`
          );
        }
      }
    }
  });
});
