import moment from 'moment';

// Models
import { User } from '../../../models/user';
import { LoginAudit } from '../../../models/login-audit';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, sanitize, getClientIp, getClientAgent } from '../../../utils';
import Token from '../../../services/token';
import Core from '../../../core';

// Others
import { PANEL_MSG } from '../../../common/messages';
import { PANEL_AUTH } from '../../../config/Constant';

//--------------------------------------------------------------

export default class AuthController {

    // Login {
    static loginPage(req: any, res: any): void {
        return res.render('panel/auth/login', {
            title: 'Login',
            layout: 'panel/layout/auth',
            isExpired: req.query?.expired == '1',
        });
    }

    static async login(req: any, res: any): Promise<void> {
        try {
            // sanitize data {
            const sanitizeResult = await sanitize(req?.body, {
                email: `required | email | lowercase | normalize: lower`,
                password: `required`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            const auditPayload: any = {
                email: body.email,
                ipAddress: getClientIp(req),
                userAgent: getClientAgent(req),
            };

            // get user {
            const user: any = await User.findOne({ email: body.email, deletedAt: null }).populate([
                { path: 'rolePermissionId', model: 'rolePermissions' },
            ]).lean();

            if (empty(user)) {
                await LoginAudit.create({ ...auditPayload, status: 'FAILED', reason: PANEL_MSG.AUTH.LOGIN.INVALID });
                throw new Error(PANEL_MSG.AUTH.LOGIN.INVALID);
            }
            auditPayload.userId = user._id;
            // } get user

            // account lock check {
            if (!empty(user.lockUntil) && moment(user.lockUntil).isAfter(moment())) {
                await LoginAudit.create({ ...auditPayload, status: 'FAILED', reason: PANEL_MSG.AUTH.LOGIN.LOCKED });
                throw new Error(PANEL_MSG.AUTH.LOGIN.LOCKED);
            }
            // } account lock check

            // account active / status check {
            if (user.isActive === false) {
                await LoginAudit.create({ ...auditPayload, status: 'FAILED', reason: PANEL_MSG.AUTH.LOGIN.INACTIVE });
                throw new Error(PANEL_MSG.AUTH.LOGIN.INACTIVE);
            }
            if (!user.rolePermissionId?.permission?.isMaster && user.status !== 'APPROVED') {
                await LoginAudit.create({ ...auditPayload, status: 'FAILED', reason: PANEL_MSG.AUTH.LOGIN.NOT_APPROVED });
                throw new Error(PANEL_MSG.AUTH.LOGIN.NOT_APPROVED);
            }
            // } account active / status check

            // verify password {
            const isValidPassword = !empty(user?.password?.hash) && !empty(user?.password?.salt) && Token.Password.verifyPassword(body.password, user.password.hash, user.password.salt);
            if (!isValidPassword) {
                // failed login protection {
                const failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
                const update: any = { failedLoginAttempts };
                if (failedLoginAttempts >= PANEL_AUTH.MAX_FAILED_LOGIN_ATTEMPTS) {
                    update.lockUntil = moment().add(PANEL_AUTH.LOCK_DURATION_IN_MINUTE, 'minutes').toDate();
                    update.failedLoginAttempts = 0;
                }
                await User.findByIdAndUpdate(user._id, update);
                // } failed login protection

                await LoginAudit.create({ ...auditPayload, status: 'FAILED', reason: PANEL_MSG.AUTH.LOGIN.INVALID });
                throw new Error(PANEL_MSG.AUTH.LOGIN.INVALID);
            }
            // } verify password

            // reset failed attempts and set session {
            await User.findByIdAndUpdate(user._id, {
                failedLoginAttempts: 0,
                lockUntil: null,
                lastLoginAt: new Date(),
                isLoggedIn: true,
            });

            req.session.panelUserId = user._id;
            req.session.panelLastActivity = Date.now();

            await LoginAudit.create({ ...auditPayload, status: 'SUCCESS', reason: null });
            // } reset failed attempts and set session

            return res.redirect('/panel/dashboard');
        } catch (e: any) {
            req.setFlash?.('error', e?.message || PANEL_MSG.AUTH.LOGIN.INVALID);
            return res.redirect('/panel/login');
        }
    }

    static logout(req: any, res: any): void {
        const userId = req.session?.panelUserId;

        req.session.destroy(async () => {
            if (!empty(userId)) await User.findByIdAndUpdate(userId, { isLoggedIn: false }).catch(() => null);
            res.redirect('/panel/login');
        });
    }
    // } Login


    // Forgot Password {
    static forgotPasswordPage(req: any, res: any): void {
        return res.render('panel/auth/forgot-password', { title: 'Forgot Password', layout: 'panel/layout/auth' });
    }

    static async forgotPassword(req: any, res: any): Promise<void> {
        try {
            const sanitizeResult = await sanitize(req?.body, {
                email: `required | email | lowercase | normalize: lower`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            const user: any = await User.findOne({ email: body.email, deletedAt: null }).lean();
            if (empty(user)) throw new Error(PANEL_MSG.AUTH.FORGOT_PASSWORD.INVALID_EMAIL);

            const otpSendRes: any = await Core.Otp.emailOtpSend(user._id);
            if (otpSendRes?.error) throw new Error(otpSendRes?.error);

            req.session.panelResetUserId = user._id;

            return res.redirect('/panel/forgot-password/verify-otp');
        } catch (e: any) {
            req.setFlash?.('error', e?.message);
            return res.redirect('/panel/forgot-password');
        }
    }

    static verifyOtpPage(req: any, res: any): void {
        if (empty(req.session?.panelResetUserId)) return res.redirect('/panel/forgot-password');
        return res.render('panel/auth/verify-otp', { title: 'Verify OTP', layout: 'panel/layout/auth' });
    }

    static async verifyOtp(req: any, res: any): Promise<void> {
        try {
            if (empty(req.session?.panelResetUserId)) throw new Error(PANEL_MSG.AUTH.SESSION.EXPIRED);

            const sanitizeResult = await sanitize(req?.body, {
                otp: `required`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            const verifyRes: any = await Core.Otp.emailOtpVerify(req.session.panelResetUserId, body.otp);
            if (verifyRes?.error) throw new Error(verifyRes?.error);

            req.session.panelResetVerified = true;

            return res.redirect('/panel/forgot-password/reset');
        } catch (e: any) {
            req.setFlash?.('error', e?.message);
            return res.redirect('/panel/forgot-password/verify-otp');
        }
    }

    static resetPasswordPage(req: any, res: any): void {
        if (empty(req.session?.panelResetUserId) || !req.session?.panelResetVerified) return res.redirect('/panel/forgot-password');
        return res.render('panel/auth/reset-password', { title: 'Reset Password', layout: 'panel/layout/auth' });
    }

    static async resetPassword(req: any, res: any): Promise<void> {
        try {
            if (empty(req.session?.panelResetUserId) || !req.session?.panelResetVerified) throw new Error(PANEL_MSG.AUTH.SESSION.EXPIRED);

            const sanitizeResult = await sanitize(req?.body, {
                password: `required | password`,
                confirmPassword: `required | matchwith: password (${PANEL_MSG.AUTH.CHANGE_PASSWORD.NOT_MATCH})`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            const password = Token.Password.encryptPassword(body.password);
            await User.findByIdAndUpdate(req.session.panelResetUserId, { password, failedLoginAttempts: 0, lockUntil: null });

            req.session.panelResetUserId = null;
            req.session.panelResetVerified = null;

            req.setFlash?.('success', PANEL_MSG.AUTH.FORGOT_PASSWORD.SUCCESS);
            return res.redirect('/panel/login');
        } catch (e: any) {
            req.setFlash?.('error', e?.message);
            return res.redirect('/panel/forgot-password/reset');
        }
    }
    // } Forgot Password


    // Change Password (logged-in) {
    static changePasswordPage(req: any, res: any): void {
        return res.render('panel/auth/change-password', {
            title: 'Change Password',
            layout: 'panel/layout/main',
        });
    }

    static async changePassword(req: any, res: any): Promise<void> {
        const { panelUser } = req;

        try {
            const sanitizeResult = await sanitize(req?.body, {
                currentPassword: `required`,
                newPassword: `required | password`,
                confirmPassword: `required | matchwith: newPassword (${PANEL_MSG.AUTH.CHANGE_PASSWORD.NOT_MATCH})`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;

            if (!Token.Password.verifyPassword(body.currentPassword, panelUser?.password?.hash, panelUser?.password?.salt)) {
                throw new Error(PANEL_MSG.AUTH.CHANGE_PASSWORD.INCORRECT);
            }

            const password = Token.Password.encryptPassword(body.newPassword);
            await User.findByIdAndUpdate(panelUser._id, { password });

            req.setFlash?.('success', PANEL_MSG.AUTH.CHANGE_PASSWORD.SUCCESS);
            return res.redirect('/panel/change-password');
        } catch (e: any) {
            req.setFlash?.('error', e?.message);
            return res.redirect('/panel/change-password');
        }
    }
    // } Change Password (logged-in)

}
