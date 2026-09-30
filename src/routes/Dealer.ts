import { Router } from 'express';

// Middleware
import dealerAuth from '../middleware/DealerAuth';

// Controller
import Auth from '../controllers/dealer/auth';
import Catalogue from '../controllers/dealer/catalogue';
import Cart from '../controllers/dealer/cart';
import Order from '../controllers/dealer/order';
import Profile from '../controllers/dealer/profile';
import Dashboard from '../controllers/dealer/dashboard';
import Notification from '../controllers/dealer/notification';
import Preference from '../controllers/dealer/preference';
import Config from '../controllers/dealer/config';

const route = Router();

//--------------------------------------------------------------

// Session
route.post('/auth/login', Auth.Session.login);
route.post('/auth/token/refresh', Auth.Session.refresh);
route.post('/auth/token/validate', dealerAuth, Auth.Session.validate);
route.post('/auth/logout', dealerAuth, Auth.Session.logout);

// Password Forgot / Reset (also used for first-time password setup)
route.post('/auth/password/forgot', Auth.Password.forgot);
route.post('/auth/password/otp/resend', Auth.Password.resend);
route.post('/auth/password/otp/verify', Auth.Password.verify);
route.post('/auth/password/reset', Auth.Password.reset);

// Password Change
route.post('/auth/password/change', dealerAuth, Auth.Password.change);

// Catalogue - everything below requires a dealer session
route.post('/home', dealerAuth, Catalogue.Home.index);
route.post('/catalogue/category/list', dealerAuth, Catalogue.Category.list);
route.post('/catalogue/product/list', dealerAuth, Catalogue.Product.list);
route.post('/catalogue/product/details', dealerAuth, Catalogue.Product.details);

// Search
route.post('/catalogue/search/suggestions', dealerAuth, Catalogue.Search.suggestions);
route.post('/catalogue/search/recent', dealerAuth, Catalogue.Search.recent);
route.post('/catalogue/search/recent/remove', dealerAuth, Catalogue.Search.removeRecent);
route.post('/catalogue/search/recent/clear', dealerAuth, Catalogue.Search.clearRecent);

// Cart
route.post('/cart/details', dealerAuth, Cart.details);
route.post('/cart/item/add', dealerAuth, Cart.add);
route.post('/cart/item/update', dealerAuth, Cart.update);
route.post('/cart/item/remove', dealerAuth, Cart.remove);
route.post('/cart/clear', dealerAuth, Cart.clear);

// Purchase Orders
route.post('/order/create', dealerAuth, Order.create);
route.post('/order/list', dealerAuth, Order.list);
route.post('/order/details', dealerAuth, Order.details);
route.post('/order/pdf', dealerAuth, Order.pdf);

// Profile
route.post('/profile/details', dealerAuth, Profile.details);
route.post('/profile/image/set', dealerAuth, Profile.setImage);
route.post('/profile/image/remove', dealerAuth, Profile.removeImage);

// Dashboard
route.post('/dashboard', dealerAuth, Dashboard.index);

// Notifications
route.post('/notification/list', dealerAuth, Notification.list);
route.post('/notification/read', dealerAuth, Notification.read);
route.post('/notification/read-all', dealerAuth, Notification.readAll);

// App Preferences
route.post('/preference/details', dealerAuth, Preference.details);
route.post('/preference/update', dealerAuth, Preference.update);

// Help & Support
route.post('/config/support', dealerAuth, Config.support);

// 404
route.all('*', (req: any, res: any) => {
    return res.status(404).send({ status: false, message: '404 - The request URL was not found on this server.', data: {} });
});

//--------------------------------------------------------------
export default route;
