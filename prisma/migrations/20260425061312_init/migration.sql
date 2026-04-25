-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Brute" (
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

-- CreateTable
CREATE TABLE "Combat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bruteAId" TEXT NOT NULL,
    "bruteBId" TEXT NOT NULL,
    "winner" TEXT NOT NULL,
    "log" TEXT NOT NULL,
    "fightType" TEXT NOT NULL DEFAULT 'normal',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Combat_bruteAId_fkey" FOREIGN KEY ("bruteAId") REFERENCES "Brute" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Combat_bruteBId_fkey" FOREIGN KEY ("bruteBId") REFERENCES "Brute" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "rounds" TEXT NOT NULL,
    "champion" TEXT NOT NULL,
    "ascended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Brute_name_key" ON "Brute"("name");

-- CreateIndex
CREATE INDEX "Brute_userId_idx" ON "Brute"("userId");

-- CreateIndex
CREATE INDEX "Brute_masterId_idx" ON "Brute"("masterId");

-- CreateIndex
CREATE INDEX "Combat_bruteAId_idx" ON "Combat"("bruteAId");

-- CreateIndex
CREATE INDEX "Combat_bruteBId_idx" ON "Combat"("bruteBId");

-- CreateIndex
CREATE INDEX "Tournament_playerId_idx" ON "Tournament"("playerId");
