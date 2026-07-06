-- Server-issued fight tickets prevent clients from choosing arbitrary competitive opponents.
CREATE TABLE "MatchTicket" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "playerId" TEXT NOT NULL,
  "opponentId" TEXT NOT NULL,
  "wallet" TEXT NOT NULL,
  "fightType" TEXT NOT NULL DEFAULT 'normal',
  "usedAt" DATETIME,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatchTicket_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Brute" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MatchTicket_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "Brute" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "MatchTicket_playerId_idx" ON "MatchTicket"("playerId");
CREATE INDEX "MatchTicket_opponentId_idx" ON "MatchTicket"("opponentId");
CREATE INDEX "MatchTicket_wallet_idx" ON "MatchTicket"("wallet");
CREATE INDEX "MatchTicket_expiresAt_idx" ON "MatchTicket"("expiresAt");

-- Internal action trail for abuse/debug review. Keep payload compact and non-secret.
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "wallet" TEXT,
  "bruteId" TEXT,
  "action" TEXT NOT NULL,
  "metadata" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AuditLog_wallet_idx" ON "AuditLog"("wallet");
CREATE INDEX "AuditLog_bruteId_idx" ON "AuditLog"("bruteId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
