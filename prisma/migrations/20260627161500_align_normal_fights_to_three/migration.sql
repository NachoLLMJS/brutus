-- Align visible normal fights with the real on-chain daily action limit (3).
UPDATE "Brute" SET "fightsRemaining" = 3 WHERE "fightsRemaining" > 3;
