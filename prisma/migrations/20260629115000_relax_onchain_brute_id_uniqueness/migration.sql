-- Allow local/dev DBs to survive registry resets or redeploys where on-chain brute ids restart.
-- The transaction hash is the real unique proof of a paid creation; the numeric
-- id is still indexed for lookup/debugging but no longer globally unique.
DROP INDEX IF EXISTS "Brute_onChainBruteId_key";
CREATE INDEX IF NOT EXISTS "Brute_onChainBruteId_idx" ON "Brute"("onChainBruteId");
CREATE UNIQUE INDEX IF NOT EXISTS "Brute_createTxHash_key" ON "Brute"("createTxHash");
