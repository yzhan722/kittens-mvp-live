-- Migration 006: Fix composite index column order for leaderboard queries
--
-- The previous migration (005) created indexes with wrong column order:
--   (column DESC, updatedAt) -- WRONG
-- Query pattern: WHERE updatedAt > ? ORDER BY column DESC
-- Correct order: (updatedAt, column DESC) -- so SQLite seeks on updatedAt then sorts
--
-- This migration drops the old indexes and recreates them with correct column order.

-- Drop old (incorrect) indexes
DROP INDEX IF EXISTS idx_scores_total_power_updated;
DROP INDEX IF EXISTS idx_scores_power_updated;
DROP INDEX IF EXISTS idx_scores_dex_updated;
DROP INDEX IF EXISTS idx_scores_catch_updated;
DROP INDEX IF EXISTS idx_scores_hatch_updated;
DROP INDEX IF EXISTS idx_scores_shiny_updated;
DROP INDEX IF EXISTS idx_scores_gather_updated;
DROP INDEX IF EXISTS idx_scores_resource_updated;

-- Create correct indexes: (updatedAt, column DESC)
CREATE INDEX IF NOT EXISTS idx_scores_total_power_updated ON scores(updatedAt, totalPower DESC);
CREATE INDEX IF NOT EXISTS idx_scores_power_updated ON scores(updatedAt, power DESC);
CREATE INDEX IF NOT EXISTS idx_scores_dex_updated ON scores(updatedAt, dexCount DESC);
CREATE INDEX IF NOT EXISTS idx_scores_catch_updated ON scores(updatedAt, catchCount DESC);
CREATE INDEX IF NOT EXISTS idx_scores_hatch_updated ON scores(updatedAt, hatchCount DESC);
CREATE INDEX IF NOT EXISTS idx_scores_shiny_updated ON scores(updatedAt, shinyCount DESC);
CREATE INDEX IF NOT EXISTS idx_scores_gather_updated ON scores(updatedAt, gatherClicks DESC);
CREATE INDEX IF NOT EXISTS idx_scores_resource_updated ON scores(updatedAt, resourceProduced DESC);
