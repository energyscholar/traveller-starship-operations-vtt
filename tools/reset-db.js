#!/usr/bin/env node
/**
 * Reset database to gold master state
 *
 * Usage: node tools/reset-db.js [--force]
 *
 * Options:
 *   --force   Skip confirmation prompt
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DB_PATH = path.join(__dirname, '../data/campaigns/operations.db');
const GOLD_MASTER_PATH = path.join(__dirname, '../data/snapshots/gold-master.db');
const WAL_PATH = DB_PATH + '-wal';
const SHM_PATH = DB_PATH + '-shm';

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

async function resetDatabase() {
  console.log('========================================');
  console.log('DATABASE RESET TOOL');
  console.log('========================================\n');

  // Check gold master exists
  if (!fs.existsSync(GOLD_MASTER_PATH)) {
    console.error('ERROR: Gold master not found at:', GOLD_MASTER_PATH);
    console.error('Run seed-dorannia.js first, then create snapshot.');
    process.exit(1);
  }

  // Check for --force flag
  const force = process.argv.includes('--force');

  if (!force) {
    console.log('This will REPLACE the current database with the gold master.');
    console.log('Current DB:', DB_PATH);
    console.log('Gold master:', GOLD_MASTER_PATH);
    console.log('');

    const proceed = await confirm('Proceed?');
    if (!proceed) {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  // Remove WAL and SHM files
  if (fs.existsSync(WAL_PATH)) {
    fs.unlinkSync(WAL_PATH);
    console.log('Removed:', WAL_PATH);
  }
  if (fs.existsSync(SHM_PATH)) {
    fs.unlinkSync(SHM_PATH);
    console.log('Removed:', SHM_PATH);
  }

  // Copy gold master to DB path
  fs.copyFileSync(GOLD_MASTER_PATH, DB_PATH);
  console.log('Restored:', DB_PATH);

  console.log('\n========================================');
  console.log('DATABASE RESET COMPLETE');
  console.log('========================================');
}

resetDatabase().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
