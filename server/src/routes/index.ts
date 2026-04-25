import { Router } from 'express';
import { healthRouter } from './health.js';
import { brutesRouter } from './brutes.js';
import { fightsRouter } from './fights.js';
import { tournamentsRouter } from './tournaments.js';

export const apiRouter: Router = Router();

apiRouter.use('/health', healthRouter);
// Fights and tournaments hang off /brutes/:id; mount them on the same root.
apiRouter.use('/brutes', brutesRouter);
apiRouter.use('/brutes', fightsRouter);
apiRouter.use('/brutes', tournamentsRouter);
