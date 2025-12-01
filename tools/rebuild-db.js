#!/usr/bin/env node
/**
 * Rebuild Database Tool
 * Destroys and recreates the database from scratch, then seeds with Dorannia campaign.
 *
 * Usage: node tools/rebuild-db.js [--force]
 *
 * Options:
 *   --force   Skip confirmation prompt
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../data/campaigns/operations.db');
const WAL_PATH = DB_PATH + '-wal';
const SHM_PATH = DB_PATH + '-shm';
const SCHEMA_PATH = path.join(__dirname, '../data/schema/schema.sql');
const GOLD_MASTER_PATH = path.join(__dirname, '../data/snapshots/gold-master.db');

async function confirm(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(message + ' (y/N): ', answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function rebuildDatabase() {
  console.log('========================================');
  console.log('DATABASE REBUILD TOOL');
  console.log('========================================\n');

  // Check for --force flag
  const force = process.argv.includes('--force');

  if (!force) {
    console.log('WARNING: This will DESTROY all data and rebuild the database!');
    console.log('Database:', DB_PATH);
    console.log('');

    const proceed = await confirm('Are you sure you want to proceed?');
    if (!proceed) {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  // Step 1: Remove existing database files
  console.log('\n1. Removing existing database...');
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  if (fs.existsSync(WAL_PATH)) fs.unlinkSync(WAL_PATH);
  if (fs.existsSync(SHM_PATH)) fs.unlinkSync(SHM_PATH);
  console.log('   Done.');

  // Step 2: Create new database with schema
  console.log('\n2. Creating new database with schema...');
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Read and execute schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);
  console.log('   Schema applied.');
  db.close();

  // Step 3: Seed with Dorannia campaign
  console.log('\n3. Seeding Dorannia campaign...');
  const { seedDoranniaCampaign } = require('../lib/operations/seed-dorannia');
  seedDoranniaCampaign();

  // Step 4: Create gold master snapshot
  console.log('\n4. Creating gold master snapshot...');
  const dbForSnapshot = new Database(DB_PATH);
  dbForSnapshot.pragma('wal_checkpoint(TRUNCATE)');
  dbForSnapshot.close();

  const snapshotDir = path.dirname(GOLD_MASTER_PATH);
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }
  fs.copyFileSync(DB_PATH, GOLD_MASTER_PATH);
  console.log('   Snapshot saved to:', GOLD_MASTER_PATH);

  console.log('\n========================================');
  console.log('DATABASE REBUILD COMPLETE');
  console.log('========================================');
  console.log('Database:', DB_PATH);
  console.log('Gold master:', GOLD_MASTER_PATH);
  console.log('');
  console.log('You can now start the server with: npm start');
}

rebuildDatabase().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
