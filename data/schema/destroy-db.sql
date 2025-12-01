-- Traveller Starship Operations VTT - Destroy Database
-- Version: 1.0
-- Created: 2025-12-01
--
-- WARNING: This script drops ALL tables and data!
-- Use with caution - data cannot be recovered.
--
-- Usage: Run before schema.sql to completely rebuild the database.

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS v_ship_roster;
DROP VIEW IF EXISTS v_campaign_summary;

-- Drop tables in dependency order (children first)
DROP TABLE IF EXISTS fuel_tanks;
DROP TABLE IF EXISTS ship_log;
DROP TABLE IF EXISTS npc_crew;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS player_accounts;
DROP TABLE IF EXISTS ships;
DROP TABLE IF EXISTS campaigns;

-- Vacuum to reclaim space
VACUUM;
