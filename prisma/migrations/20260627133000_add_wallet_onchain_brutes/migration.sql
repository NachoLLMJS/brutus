-- Add wallet/on-chain linkage for real Brutus creation limits.
ALTER TABLE "Brute" ADD COLUMN "ownerWallet" TEXT;
ALTER TABLE "Brute" ADD COLUMN "onChainBruteId" INTEGER;
ALTER TABLE "Brute" ADD COLUMN "createTxHash" TEXT;

CREATE UNIQUE INDEX "Brute_onChainBruteId_key" ON "Brute"("onChainBruteId");
CREATE INDEX "Brute_ownerWallet_idx" ON "Brute"("ownerWallet");
