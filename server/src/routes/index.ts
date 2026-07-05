import { Router } from 'express';
import { authRouter } from './auth.js';
import { healthRouter } from './health.js';
import { brutesRouter } from './brutes.js';
import { fightsRouter } from './fights.js';
import { tournamentsRouter } from './tournaments.js';

export const apiRouter: Router = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
// Fights and tournaments hang off /brutes/:id; mount them on the same root.
apiRouter.use('/brutes', brutesRouter);
apiRouter.use('/brutes', fightsRouter);
apiRouter.use('/brutes', tournamentsRouter);
