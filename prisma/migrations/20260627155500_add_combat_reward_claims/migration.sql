ALTER TABLE "Combat" ADD COLUMN "rewardFightId" TEXT;
ALTER TABLE "Combat" ADD COLUMN "rewardWinnerWallet" TEXT;
ALTER TABLE "Combat" ADD COLUMN "rewardRecordedTxHash" TEXT;
ALTER TABLE "Combat" ADD COLUMN "rewardClaimTxHash" TEXT;
ALTER TABLE "Combat" ADD COLUMN "rewardClaimedAt" DATETIME;

CREATE UNIQUE INDEX "Combat_rewardFightId_key" ON "Combat"("rewardFightId");
