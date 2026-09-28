import mongoose from 'mongoose';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess } from '../utils';

// Others
import Config from './';

//--------------------------------------------------------------

export default (cb: () => void): void => {

    const connect = async (): Promise<void> => {
        mongoose.connect(Config.DATABASE.CONNECTION_STRING, {
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
            connectTimeoutMS: Config.DATABASE.CONNECT_TIMEOUT,
            // useFindAndModify: false,
            // useCreateIndex: true
        });
    };

    mongoose.connection.on('open', (): void => {
        logSuccess(`[DATABASE] - mongodb connected...`);
        cb();
    });

    mongoose.connection.on('error', (err): void => {
        logError(`[DATABASE] - ${err.message}`, null);
        process.exit(0);
    });

    mongoose.connection.on('disconnected', (): void => {
        logWarn('[DATABASE] - reconnecting to mongo database...');
        setTimeout(connect, Config.DATABASE.RECONNECT_DELAY);
    });

    connect();
}
