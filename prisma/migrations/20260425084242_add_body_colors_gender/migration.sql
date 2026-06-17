-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Brute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "hp" INTEGER NOT NULL,
    "strength" INTEGER NOT NULL,
    "agility" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,
    "skills" TEXT NOT NULL,
    "weapons" TEXT NOT NULL,
    "pets" TEXT NOT NULL,
    "appearance" TEXT NOT NULL,
    "gender" TEXT NOT NULL DEFAULT 'male',
    "body" TEXT NOT NULL DEFAULT '',
    "bodyColors" TEXT NOT NULL DEFAULT '',
    "victories" INTEGER NOT NULL DEFAULT 0,
    "defeats" INTEGER NOT NULL DEFAULT 0,
    "fightsRemaining" INTEGER NOT NULL DEFAULT 5,
    "trainingFightsRemaining" INTEGER NOT NULL DEFAULT 10,
    "defeatsToday" INTEGER NOT NULL DEFAULT 0,
    "lastFightReset" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "masterId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Brute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Brute_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "Brute" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Brute" ("agility", "appearance", "createdAt", "defeats", "defeatsToday", "fightsRemaining", "hp", "id", "lastFightReset", "level", "masterId", "name", "pets", "rank", "seed", "skills", "speed", "strength", "trainingFightsRemaining", "userId", "victories", "weapons", "xp") SELECT "agility", "appearance", "createdAt", "defeats", "defeatsToday", "fightsRemaining", "hp", "id", "lastFightReset", "level", "masterId", "name", "pets", "rank", "seed", "skills", "speed", "strength", "trainingFightsRemaining", "userId", "victories", "weapons", "xp" FROM "Brute";
DROP TABLE "Brute";
ALTER TABLE "new_Brute" RENAME TO "Brute";
CREATE UNIQUE INDEX "Brute_name_key" ON "Brute"("name");
CREATE INDEX "Brute_userId_idx" ON "Brute"("userId");
CREATE INDEX "Brute_masterId_idx" ON "Brute"("masterId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
