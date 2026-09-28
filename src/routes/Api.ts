import multer from 'multer';
import { Router } from 'express';

// Middleware
import apiAuth from '../middleware/ApiAuth';

// Controller
import ShippingOrder from '../controllers/api/shipping-order';

const route = Router();

//--------------------------------------------------------------

route.post('/shipping-order/track', ShippingOrder.Main.track);


// 404
route.all('*', (req: any, res: any) => {
    return res.status(404).send('404 - The request URL was not found on this server.');
});

//--------------------------------------------------------------
export default route;