import { prisma } from '../db.js';
import { logger } from '../logger.js';

export interface AuditInput {
  wallet?: string | null;
  bruteId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        wallet: input.wallet?.toLowerCase() ?? null,
        bruteId: input.bruteId ?? null,
        action: input.action,
        metadata: input.metadata ? JSON.stringify(input.metadata).slice(0, 4000) : null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ? input.userAgent.slice(0, 500) : null,
      },
    });
  } catch (err) {
    logger.warn({ err, action: input.action, wallet: input.wallet, bruteId: input.bruteId }, 'audit_log_write_failed');
  }
}
