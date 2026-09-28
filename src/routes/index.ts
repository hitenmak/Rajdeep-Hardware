import { Router } from 'express';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess } from '../utils';

// Routes
import devRoutes from './Dev';
import adminRoutes from './Admin';
import apiRoutes from './Api';
import panelRoutes from './Panel';

// Others
import { ROUTE_PREFIX } from './config';

const route = Router();

//--------------------------------------------------------------

// Health-check {
route.all('/health-check', (req: any, res: any) => {
    return res.status(200).send(`Hey, I'm working fine don't worry about me. Enjoy your coffee.`);
});
// } Health-check


// Routs
route.use(ROUTE_PREFIX.ADMIN, adminRoutes);
route.use(ROUTE_PREFIX.API, apiRoutes);
route.use(ROUTE_PREFIX.DEV, devRoutes);
route.use(ROUTE_PREFIX.PANEL, panelRoutes);


// 404 urls {
route.all('*', (req: any, res: any) => {
    logWarn(`[ROUTE] - 404 invalid request url: ${req.originalUrl}`);
    return res.status(404).send('404 - The request URL was not found on this server.');
});
// } 404 urls

//--------------------------------------------------------------
export default route;