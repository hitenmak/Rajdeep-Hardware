import multer from 'multer';
import { Router } from 'express';

// Controller
import Dev from '../controllers/dev';

const route = Router();

//--------------------------------------------------------------

// Data Reset
route.post('/data-reset', Dev.Test.dataReset);

// Seeder
route.post('/seeder', Dev.Test.seeder);

// Get Lat Long
route.post('/get-lat-long', Dev.Test.getLatLong);

// Barcode Generate
route.post('/barcode-generate', Dev.Test.barcodeGenerate);

// Mail Send
route.post('/mail-test', Dev.Test.mailTest);

// Notification Send
route.post('/notification-test', Dev.Test.notificationTest);

// Whatsapp Send Message
route.post('/whatsapp/send-message', Dev.Test.whatsAppSendMessage);

// Migration
route.post('/migration', Dev.Test.migration);

// 404
route.all('*', (req: any, res: any) => {
    return res.status(404).send('404 - The request URL was not found on this server.');
});

//--------------------------------------------------------------
export default route;