require('dotenv').config();
import { Server } from 'http';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, formatDate } from './src/utils';
import App from './src/app';
import EnvHandler from './src/config/Envhandler';
import DatabaseHandler from './src/config/DatabaseHandler';
import InitializationProcess from './src/config/Init';
import MediaHandler from './src/services/media/handler';

// Others
import Config from './src/config';

//--------------------------------------------------------------

if (Config.APP.MODE === 'dev') console.clear();
let server: Server | null = null;


logInfo(`...............................................`);
logWarn(`[APP-RESTART] - app restarted at: ${formatDate(new Date(), 'YYYY-MM-DDTHH:mm:ss.SSS')} UTC`);
logInfo(`[APP-MODE] - ${({ prod: 'PRODUCTION', dev: 'DEVELOPMENT', stage: 'STAGING' }[process.env.APP_MODE || '']) || 'UNKNOWN'}`);


// Check env {
EnvHandler();
// } Check env


// Database Connection {
DatabaseHandler(async (): Promise<void> => {
    server?.close(); // Server connection close before new server connection start

    // await construct(); // Data Construct

    // Server Connect {
    try {
        server = App.listen(Config.APP.SERVER_PORT, async (): Promise<any> => {

            // initialization process {
            await InitializationProcess();
            await MediaHandler.Init();
            // } initialization process

            logSuccess(`[SERVER] - Server listen on: ${Config.APP.SERVER_PORT}`);
            logSuccess(`[APP] - App is run on: ${Config.APP.URL}`);
            logSuccess(`[CORS] - Allow origin: (${Config.CORS.ALLOW_ORIGIN.length ? Config.CORS.ALLOW_ORIGIN.join(', ') : '*'})`);
            logSuccess(`[APP] - App is live now...`);
            logSuccess(`[HEALTH-CHECK] - Check app health on: ${Config.APP.URL}/health-check`);
            logSuccess(`[LOG] - Check app last 100 log on: ${Config.APP.URL}/log/debug`);
            logInfo(`...............................................`);
        });
    } catch (e: any) {
        logError(`[SERVER] - server error occurred: ${e || ''}`);
    }
    // } Server Connect
});
// } Database Connection
