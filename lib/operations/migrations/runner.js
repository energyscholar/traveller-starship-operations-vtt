/**
 * Migration Runner
 *
 * AR-115: Database UID Normalization
 *
 * Runs database migrations in order, tracking which have been applied.
 */

const fs = require('fs');
const path = require('path');

// Import all migrations in order
const migrations = [
  require('./001-system-uids'),
  require('./002-populate-system-uids'),
  require('./003-campaign-type'),
];

/**
 * Ensure migrations table exists
 * @param {Database} db - better-sqlite3 database instance
 */
function ensureMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    )
  `);
}

/**
 * Check if a migration has been recorded
 * @param {Database} db
 * @param {string} migrationId
 * @returns {boolean}
 */
function isMigrationRecorded(db, migrationId) {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM migrations WHERE id = ?
  `).get(migrationId);
  return result.count > 0;
}

/**
 * Record a migration as applied
 * @param {Database} db
 * @param {Object} migration
 */
function recordMigration(db, migration) {
  db.prepare(`
    INSERT OR REPLACE INTO migrations (id, description, applied_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `).run(migration.id, migration.description);
}

/**
 * Remove migration record
 * @param {Database} db
 * @param {string} migrationId
 */
function removeMigrationRecord(db, migrationId) {
  db.prepare(`DELETE FROM migrations WHERE id = ?`).run(migrationId);
}

/**
 * Run all pending migrations
 * @param {Database} db - better-sqlite3 database instance
 * @param {Object} options - { dryRun: boolean, verbose: boolean }
 * @returns {Object} { applied: string[], skipped: string[], errors: string[] }
 */
function runMigrations(db, options = {}) {
  const { dryRun = false, verbose = true } = options;
  const result = { applied: [], skipped: [], errors: [] };

  ensureMigrationsTable(db);

  if (verbose) {
    console.log(`[Migrations] Running ${migrations.length} migrations...`);
  }

  for (const migration of migrations) {
    try {
      // Check if already applied
      if (isMigrationRecorded(db, migration.id)) {
        result.skipped.push(migration.id);
        if (verbose) {
          console.log(`[Migrations] Skipping ${migration.id} (already applied)`);
        }
        continue;
      }

      // Also check migration's own isApplied for idempotency
      if (migration.isApplied && migration.isApplied(db)) {
        // Record it but don't run again
        if (!dryRun) {
          recordMigration(db, migration);
        }
        result.skipped.push(migration.id);
        if (verbose) {
          console.log(`[Migrations] Recording ${migration.id} (already applied externally)`);
        }
        continue;
      }

      if (dryRun) {
        if (verbose) {
          console.log(`[Migrations] Would apply: ${migration.id}`);
        }
        result.applied.push(migration.id);
        continue;
      }

      // Run migration in transaction
      db.transaction(() => {
        migration.up(db);
        recordMigration(db, migration);
      })();

      result.applied.push(migration.id);
      if (verbose) {
        console.log(`[Migrations] Applied: ${migration.id}`);
      }
    } catch (err) {
      result.errors.push(`${migration.id}: ${err.message}`);
      console.error(`[Migrations] Error in ${migration.id}:`, err.message);
      // Stop on first error
      break;
    }
  }

  if (verbose) {
    console.log(`[Migrations] Done: ${result.applied.length} applied, ${result.skipped.length} skipped, ${result.errors.length} errors`);
  }

  return result;
}

/**
 * Rollback last N migrations
 * @param {Database} db - better-sqlite3 database instance
 * @param {number} count - Number of migrations to rollback
 * @returns {Object} { rolledBack: string[], errors: string[] }
 */
function rollbackMigrations(db, count = 1) {
  const result = { rolledBack: [], errors: [] };

  ensureMigrationsTable(db);

  // Get applied migrations in reverse order
  const applied = db.prepare(`
    SELECT id FROM migrations ORDER BY applied_at DESC LIMIT ?
  `).all(count);

  for (const record of applied) {
    const migration = migrations.find(m => m.id === record.id);
    if (!migration) {
      result.errors.push(`${record.id}: Migration not found`);
      continue;
    }

    try {
      db.transaction(() => {
        migration.down(db);
        removeMigrationRecord(db, migration.id);
      })();

      result.rolledBack.push(migration.id);
      console.log(`[Migrations] Rolled back: ${migration.id}`);
    } catch (err) {
      result.errors.push(`${record.id}: ${err.message}`);
      console.error(`[Migrations] Rollback error in ${record.id}:`, err.message);
      break;
    }
  }

  return result;
}

/**
 * Get migration status
 * @param {Database} db
 * @returns {Array<{id, description, applied, applied_at}>}
 */
function getMigrationStatus(db) {
  ensureMigrationsTable(db);

  const applied = new Map();
  const records = db.prepare(`SELECT * FROM migrations`).all();
  for (const record of records) {
    applied.set(record.id, record);
  }

  return migrations.map(m => ({
    id: m.id,
    description: m.description,
    applied: applied.has(m.id),
    applied_at: applied.get(m.id)?.applied_at || null
  }));
}

module.exports = {
  migrations,
  runMigrations,
  rollbackMigrations,
  getMigrationStatus,
  ensureMigrationsTable
};
