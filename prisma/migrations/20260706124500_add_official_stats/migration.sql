-- Separate official normal-fight stats from legacy aggregate victories/defeats.
ALTER TABLE "Brute" ADD COLUMN "normalVictories" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Brute" ADD COLUMN "normalDefeats" INTEGER NOT NULL DEFAULT 0;

-- Preserve current leaderboard continuity; future training fights no longer write these fields.
UPDATE "Brute" SET "normalVictories" = "victories", "normalDefeats" = "defeats";
