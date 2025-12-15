/**
 * AR-140: Adventure Modules Tests
 *
 * Tests module creation, content tracking, and gating logic.
 */

const { db, generateId } = require('../lib/operations/database');
const modules = require('../lib/operations/modules');

// Create test campaign
function createTestCampaign() {
  const id = generateId();
  const stmt = db.prepare(`
    INSERT INTO campaigns (id, name, gm_name)
    VALUES (?, 'Test Campaign', 'TestGM')
  `);
  stmt.run(id);
  return id;
}

// Cleanup
function cleanup(campaignId) {
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(campaignId);
}

// Simple test helpers
function expect(val) {
  return {
    toBe: (expected) => {
      if (val !== expected) throw new Error(`Expected ${expected}, got ${val}`);
    },
    toBeDefined: () => {
      if (val === undefined || val === null) throw new Error('Expected defined value');
    },
    toBeNull: () => {
      if (val !== null) throw new Error(`Expected null, got ${val}`);
    },
    toEqual: (expected) => {
      if (JSON.stringify(val) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(val)}`);
      }
    },
    toBeGreaterThan: (n) => {
      if (!(val > n)) throw new Error(`Expected > ${n}, got ${val}`);
    }
  };
}

const tests = [
  ['Create module', () => {
    const campaignId = createTestCampaign();
    try {
      const module = modules.createModule(campaignId, {
        name: 'Test Adventure',
        version: '1.0'
      });
      expect(module).toBeDefined();
      expect(module.module_name).toBe('Test Adventure');
      expect(module.module_version).toBe('1.0');
      expect(module.is_active).toBe(1);
    } finally {
      cleanup(campaignId);
    }
  }],

  ['Get modules by campaign', () => {
    const campaignId = createTestCampaign();
    try {
      modules.createModule(campaignId, { name: 'Module 1' });
      modules.createModule(campaignId, { name: 'Module 2' });

      const list = modules.getModulesByCampaign(campaignId);
      expect(list.length).toBe(2);
    } finally {
      cleanup(campaignId);
    }
  }],

  ['Toggle module active state', () => {
    const campaignId = createTestCampaign();
    try {
      const module = modules.createModule(campaignId, { name: 'Toggle Test' });
      expect(module.is_active).toBe(1);

      const disabled = modules.setModuleActive(module.id, false);
      expect(disabled.is_active).toBe(0);

      const enabled = modules.setModuleActive(module.id, true);
      expect(enabled.is_active).toBe(1);
    } finally {
      cleanup(campaignId);
    }
  }],

  ['Track module content', () => {
    const campaignId = createTestCampaign();
    try {
      const module = modules.createModule(campaignId, { name: 'Content Test' });
      const contentId = generateId();

      modules.trackModuleContent(module.id, 'locations', contentId);

      const content = modules.getModuleContent(module.id);
      expect(content.length).toBe(1);
      expect(content[0].content_type).toBe('locations');
      expect(content[0].content_id).toBe(contentId);
    } finally {
      cleanup(campaignId);
    }
  }],

  ['Content accessibility - no module', () => {
    // Content not from a module is always accessible
    const randomId = generateId();
    expect(modules.isContentAccessible(randomId)).toBe(true);
  }],

  ['Content accessibility - active module, no gate', () => {
    const campaignId = createTestCampaign();
    try {
      const module = modules.createModule(campaignId, { name: 'Access Test' });
      const contentId = generateId();
      modules.trackModuleContent(module.id, 'npcs', contentId);

      expect(modules.isContentAccessible(contentId)).toBe(true);
    } finally {
      cleanup(campaignId);
    }
  }],

  ['Content accessibility - disabled module', () => {
    const campaignId = createTestCampaign();
    try {
      const module = modules.createModule(campaignId, { name: 'Disabled Test' });
      const contentId = generateId();
      modules.trackModuleContent(module.id, 'npcs', contentId);

      modules.setModuleActive(module.id, false);
      expect(modules.isContentAccessible(contentId)).toBe(false);
    } finally {
      cleanup(campaignId);
    }
  }],

  ['Content accessibility - gated content', () => {
    const campaignId = createTestCampaign();
    try {
      const module = modules.createModule(campaignId, { name: 'Gated Test' });
      const contentId = generateId();
      const gateCondition = JSON.stringify({ type: 'date_after', date: '1105-100' });
      modules.trackModuleContent(module.id, 'reveals', contentId, gateCondition);

      // Before date
      expect(modules.isContentAccessible(contentId, { currentDate: '1105-050' })).toBe(false);
      // After date
      expect(modules.isContentAccessible(contentId, { currentDate: '1105-150' })).toBe(true);
    } finally {
      cleanup(campaignId);
    }
  }],

  ['Unlock gated content', () => {
    const campaignId = createTestCampaign();
    try {
      const module = modules.createModule(campaignId, { name: 'Unlock Test' });
      const contentId = generateId();
      const gateCondition = JSON.stringify({ type: 'manual', unlocked: false });
      modules.trackModuleContent(module.id, 'events', contentId, gateCondition);

      // Initially gated
      expect(modules.isContentAccessible(contentId)).toBe(false);

      // Unlock it
      modules.unlockContent(contentId);
      expect(modules.isContentAccessible(contentId)).toBe(true);
    } finally {
      cleanup(campaignId);
    }
  }],

  ['Get module summary', () => {
    const campaignId = createTestCampaign();
    try {
      const module = modules.createModule(campaignId, { name: 'Summary Test' });

      modules.trackModuleContent(module.id, 'locations', generateId());
      modules.trackModuleContent(module.id, 'locations', generateId());
      modules.trackModuleContent(module.id, 'npcs', generateId());
      modules.trackModuleContent(module.id, 'events', generateId(), JSON.stringify({ type: 'manual' }));

      const summary = modules.getModuleSummary(module.id);
      expect(summary.contentCounts.locations.total).toBe(2);
      expect(summary.contentCounts.npcs.total).toBe(1);
      expect(summary.contentCounts.events.gated).toBe(1);
    } finally {
      cleanup(campaignId);
    }
  }],

  ['Delete module', () => {
    const campaignId = createTestCampaign();
    try {
      const module = modules.createModule(campaignId, { name: 'Delete Test' });
      modules.trackModuleContent(module.id, 'locations', generateId());

      const result = modules.deleteModule(module.id);
      expect(result.deleted).toBe(true);
      expect(result.contentCount).toBe(1);

      const deleted = modules.getModule(module.id);
      expect(deleted === undefined || deleted === null).toBe(true);
    } finally {
      cleanup(campaignId);
    }
  }]
];

// Run tests
console.log('AR-140 Adventure Modules Tests\n');
console.log('='.repeat(50));

let passed = 0;
let failed = 0;

tests.forEach(([name, fn]) => {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    failed++;
  }
});

console.log('='.repeat(50));
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

process.exit(failed > 0 ? 1 : 0);
