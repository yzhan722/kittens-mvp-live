-- Composite indexes for leaderboard queries
-- All leaderboard endpoints use: WHERE updatedAt > ? ORDER BY <column> DESC
-- For this query pattern, updatedAt must be the leading column so SQLite can
-- seek to the relevant rows, then scan them in sorted order.
-- The previous (column DESC, updatedAt) ordering was backwards and caused full scans.

CREATE INDEX IF NOT EXISTS idx_scores_total_power_updated ON scores(updatedAt, totalPower DESC);
CREATE INDEX IF NOT EXISTS idx_scores_power_updated ON scores(updatedAt, power DESC);
CREATE INDEX IF NOT EXISTS idx_scores_dex_updated ON scores(updatedAt, dexCount DESC);
CREATE INDEX IF NOT EXISTS idx_scores_catch_updated ON scores(updatedAt, catchCount DESC);
CREATE INDEX IF NOT EXISTS idx_scores_hatch_updated ON scores(updatedAt, hatchCount DESC);
CREATE INDEX IF NOT EXISTS idx_scores_shiny_updated ON scores(updatedAt, shinyCount DESC);
CREATE INDEX IF NOT EXISTS idx_scores_gather_updated ON scores(updatedAt, gatherClicks DESC);
CREATE INDEX IF NOT EXISTS idx_scores_resource_updated ON scores(updatedAt, resourceProduced DESC);
