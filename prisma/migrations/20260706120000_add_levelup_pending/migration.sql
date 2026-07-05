-- Store server-issued level-up offers so clients cannot forge arbitrary upgrades.
ALTER TABLE "Brute" ADD COLUMN "pendingLevelUpChoices" TEXT;
ALTER TABLE "Brute" ADD COLUMN "pendingLevelUpLevel" INTEGER;
ALTER TABLE "Brute" ADD COLUMN "pendingLevelUpNonce" TEXT;
