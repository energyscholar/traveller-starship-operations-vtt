-- AR-BD-1: Add weapons and combat columns to contacts table
-- This migration is idempotent - safe to run multiple times

-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- This script should be run via the JavaScript migration runner which checks first

-- Columns to add:
-- weapons TEXT                    - JSON array of weapons [{name, damage, range}]
-- gunner_skill INTEGER DEFAULT 1  - NPC gunner skill for attack rolls
-- armor INTEGER DEFAULT 0         - Armor rating for damage reduction
-- disposition TEXT DEFAULT 'unknown' - hostile, neutral, friendly, unknown

-- Run via lib/operations/migrations.js which checks column existence first
