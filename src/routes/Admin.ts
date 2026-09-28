import multer from 'multer';
import { Router } from 'express';

// Middleware
import adminAuth from '../middleware/AdminAuth';
import adminStatusApprovedAuth from '../middleware/AdminStatusApprovedAuth';
import basicAuth from '../middleware/BasicAuth';
import permissionAuth from '../middleware/Permission';

// Controller
import Common from '../controllers/common';
import Auth from '../controllers/auth';
import Dashboard from '../controllers/admin/dashboard';
import Profile from '../controllers/admin/profile';
import Setting from '../controllers/admin/setting';
import RolePermission from '../controllers/admin/role-permission';
import User from '../controllers/admin/user';
import Wallet from '../controllers/admin/wallet';
import Report from '../controllers/admin/report';

const route = Router();

//--------------------------------------------------------------

// Common {
// Webhook
route.get('/config/webhook/whatsapp', Common.Whatsapp.verify);
route.post('/config/webhook/whatsapp', Common.Whatsapp.handler);

// CMS Page
route.get('/config/terms-and-conditions', Common.CmsPage.termsAndConditions);
route.get('/config/insurance-policy', Common.CmsPage.insurancePolicy);

route.post('/config/get', Common.Main.getConfig);
route.post('/config/app/version/check', Common.Main.appVersionCheck);
route.post('/config/bank/bank-list', Common.Main.bankList);
// } Common

// Sign Up
route.post('/auth/sign-up', Auth.SignUp.signUp);
route.post('/auth/sign-up/otp/verify', basicAuth, Auth.SignUpOtp.verify);
route.post('/auth/sign-up/otp/resend', basicAuth, Auth.SignUpOtp.resend);

// Auth Login
route.post('/auth/login', Auth.SignIn.adminLogin);

route.post('/auth/social-login', Auth.SocialLogin.loginUrlGenerate);
route.get('/auth/login-with-google/callback', Auth.SocialLogin.googleLoginCallback);
route.get('/auth/login-with-facebook/callback', Auth.SocialLogin.facebookLoginCallback);
route.post('/auth/social-login/call-back', Auth.SocialLogin.loginCallback);

// Logout
route.post('/auth/logout', adminAuth, Auth.SignIn.logout);

// Password Forgot
route.post('/auth/password/forgot', Auth.ForgotPassword.forgot);
route.post('/auth/password/otp/verify', basicAuth, Auth.ForgotPassword.verify);
route.post('/auth/password/otp/resend', basicAuth, Auth.ForgotPassword.resend);
route.post('/auth/password/update', basicAuth, Auth.ForgotPassword.update);

// Dashboard
route.post('/dashboard', adminAuth, permissionAuth('DASHBOARD.VIEW'), Dashboard.Main.index);

// Profile
route.post('/profile/details', adminAuth, Profile.Main.details);
route.post('/profile/update', adminAuth, Profile.Main.update);
route.post('/profile/image/set', adminAuth, Profile.Main.upload);

route.post('/profile/password/set', Profile.Password.set);
route.post('/profile/password/update', adminAuth, Profile.Password.update);

// route.post('/profile/maf-2fa/qr-code', adminStatusApprovedAuth, Profile.Mfa2fa.getQrCode);
// route.post('/profile/maf-2fa/verify', adminStatusApprovedAuth, Profile.Mfa2fa.verify);
// route.post('/profile/maf-2fa/reactive', adminStatusApprovedAuth, Profile.Mfa2fa.reactive);

// Bank Details
route.post('/profile/bank/details', adminAuth, permissionAuth('BANK-DETAILS.VIEW'), Profile.Bank.details);
route.post('/profile/bank/update', adminStatusApprovedAuth, permissionAuth('BANK-DETAILS.VIEW'), Profile.Bank.update);

// Setting
route.post('/setting/details', adminAuth, permissionAuth('X'), Setting.Main.details);
route.post('/setting/set', adminStatusApprovedAuth, permissionAuth('X'), Setting.Main.set);

// Role permission
route.post('/role-permission/config', adminAuth, permissionAuth('X'), RolePermission.Main.config);
route.post('/role-permission/list', adminAuth, permissionAuth('X'), RolePermission.Main.list);
route.post('/role-permission/details', adminAuth, permissionAuth('X'), RolePermission.Main.details);
route.post('/role-permission/set', adminStatusApprovedAuth, permissionAuth('X'), RolePermission.Main.set);
route.post('/role-permission/delete', adminStatusApprovedAuth, permissionAuth('X'), RolePermission.Main.delete);

// User
route.post('/user/create', adminStatusApprovedAuth, permissionAuth('USER.CREATE'), User.Main.create);
route.post('/user/list', adminAuth, permissionAuth('USER.VIEW'), User.Main.list);
route.post('/user/details', adminAuth, permissionAuth('USER.VIEW'), User.Main.details);
route.post('/user/profile/image/set', adminAuth, permissionAuth('USER.UPDATE'), User.Main.upload);
route.post('/user/update', adminStatusApprovedAuth, permissionAuth('USER.UPDATE'), User.Main.update);
route.post('/user/status', adminStatusApprovedAuth, permissionAuth('USER.STATUS'), User.Main.status);
route.post('/user/delete', adminStatusApprovedAuth, permissionAuth('USER.DELETE'), User.Main.delete);

// Wallet
route.post('/wallet/details', adminAuth, permissionAuth('EARNING.VIEW'), Wallet.Main.details);
route.post('/wallet/deposit', adminStatusApprovedAuth, permissionAuth('EARNING.VIEW'), Wallet.Main.deposit);
route.post('/wallet/withdraw', adminStatusApprovedAuth, permissionAuth('EARNING.VIEW'), Wallet.Main.withdraw);
route.post('/wallet/finalize/withdraw', adminStatusApprovedAuth, permissionAuth('EARNING.VIEW'), Wallet.Main.finalizeWithdraw);

// Report
route.post('/report/', adminAuth, Report.Main.report);
route.post('/report/export', adminAuth, Report.Export.reportExport);

// 404
route.all('*', (req: any, res: any) => {
    return res.status(404).send('404 - The request URL was not found on this server.');
});

//--------------------------------------------------------------
export default route;