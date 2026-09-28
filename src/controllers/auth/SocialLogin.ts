const axios = require('axios');
const { google } = require('googleapis');

// Models
import { RolePermission } from '../../models/role-permission';
import { User } from '../../models/user';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getStr, getBool, lower, sanitize, } from '../../utils';
import Token from '../../services/token';
import { Format } from './helper';

// Others
import Config from '../../config';
import ApiEndpoint from '../../config/ApiEndpoint';
import { INTERNAL_MSG, ADMIN_MSG } from '../../common/messages';
import Core from '../../core';

//--------------------------------------------------------------

export default class SocialLogin {

    // generate social login url {
    static async loginUrlGenerate(req: any, res: any): Promise<void> {
        try {
            // sanitize data {
            const sanitizeResult = await sanitize(req?.body, {
                socialType: `required`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            let url = ``;

            // google auth url generate {
            if (body?.socialType === 'GOOGLE') {
                // const oauth2Client = new google.auth.OAuth2(Config.GOOGLE.CLIENT_ID, Config.GOOGLE.CLIENT_SECRET, Config.GOOGLE.REDIRECT_URI);
                // const url = oauth2Client.generateAuthUrl({
                //     access_type: 'offline',
                //     prompt: 'consent',
                //     scope: ['openid', 'profile', 'email']
                // });

                url = `https://accounts.google.com/o/oauth2/v2/auth?` +
                    `client_id=${encodeURIComponent(getStr(Config.GOOGLE.CLIENT_ID))}` +
                    `&redirect_uri=${encodeURIComponent(Config.GOOGLE.REDIRECT_URI)}` +
                    `&scope=${encodeURIComponent('openid profile email')}` +
                    `&response_type=code` +
                    `&access_type=offline` +
                    `&prompt=consent`;
            }
            // } google auth url generate

            // facebook auth url generate {
            if (body?.socialType === 'FACEBOOK') {
                url = `https://www.facebook.com/v19.0/dialog/oauth?` +
                    `client_id=${encodeURIComponent(getStr(Config.FACEBOOK.CLIENT_ID))}` +
                    `&client_secret=${encodeURIComponent(getStr(Config.FACEBOOK.CLIENT_SECRET))}` +
                    `&redirect_uri=${encodeURIComponent(Config.FACEBOOK.REDIRECT_URI)}` +
                    `&scope=email,public_profile`;
            }
            // } facebook auth url generate

            return res.status(200).send({ status: true, message: INTERNAL_MSG.AUTH.SOCIAL_LOGIN.URL_GENERATE, data: { socialType: body?.socialType, url } });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }
    // } generate social login url

    // google auth login {
    static async googleLoginCallback(req: any, res: any): Promise<void> {
        try {
            // get access token {
            const code = req.query.code;
            if (!code) throw new Error(INTERNAL_MSG.AUTH.SOCIAL_LOGIN.AUTH_CODE);

            const oauth2Client = new google.auth.OAuth2(Config.GOOGLE.CLIENT_ID, Config.GOOGLE.CLIENT_SECRET, Config.GOOGLE.REDIRECT_URI);
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);

            const accessToken = tokens?.access_token;
            if (!accessToken) throw new Error(INTERNAL_MSG.AUTH.SOCIAL_LOGIN.UNABLE_ACCESS_TOKEN);
            // } get access token

            // get user {
            // const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
            // const userResponse = await oauth2.userinfo.get();

            const userResponse = await axios.get(`https://oauth2.googleapis.com/tokeninfo`, {
                params: {
                    id_token: tokens.id_token
                }
            });
            const userData = userResponse?.data || {};
            // d(userData, 'userData');
            // } get user

            let user: any = await User.findOne({ email: userData?.email, deletedAt: null }).lean();
            if (user) {
                await User.findByIdAndUpdate(user?._id, { isLoggedIn: true, basicToken: accessToken || null }, { new: true }).lean();
            } else {
                const rolePermission: any = await RolePermission.findOne({ department: 'MERCHANT' }).lean();

                user = await User.create({
                    rolePermissionId: rolePermission?._id,
                    firstName: userData?.given_name,
                    lastName: userData?.family_name,
                    email: userData?.email,
                    isEmailVerified: true,
                    isProfileImageLocalStorage: false,
                    profileImage: userData?.picture || null,
                    basicToken: accessToken || null,
                    isTermsAndConditions: true,
                    isLoggedIn: true,
                    status: 'APPROVED',
                });
            }

            res.redirect(`${ApiEndpoint.WEB_APP.SOCIAL_LOGIN_MEMBER_URL}${accessToken}`);
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }
    // } google auth login

    // facebook auth login {
    static async facebookLoginCallback(req: any, res: any): Promise<void> {
        try {
            // get access token {
            const code = req.query.code;
            if (!code) throw new Error(INTERNAL_MSG.AUTH.SOCIAL_LOGIN.AUTH_CODE);

            const tokenResponse = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
                params: {
                    client_id: Config.FACEBOOK.CLIENT_ID,
                    client_secret: Config.FACEBOOK.CLIENT_SECRET,
                    redirect_uri: Config.FACEBOOK.REDIRECT_URI,
                    code
                }
            });

            const accessToken = tokenResponse?.data?.access_token;
            if (!accessToken) throw new Error(INTERNAL_MSG.AUTH.SOCIAL_LOGIN.UNABLE_ACCESS_TOKEN);
            // } get access token

            // get user {
            const userResponse = await axios.get(`https://graph.facebook.com/me`, {
                params: {
                    fields: 'id,first_name,last_name,name,email,picture', // picture.type(large)
                    access_token: accessToken
                }
            });
            const userData = userResponse?.data || {};
            // d(userData, 'userData');
            // } get user

            let user: any = await User.findOne({ email: userData?.email, deletedAt: null }).lean();
            if (user) {
                await User.findByIdAndUpdate(user?._id, { isLoggedIn: true, basicToken: accessToken || null }, { new: true }).lean();
            } else {
                let rolePermission: any = await RolePermission.findOne({ department: 'MERCHANT' }).lean();

                user = await User.create({
                    rolePermissionId: rolePermission?._id,
                    firstName: userData?.first_name,
                    lastName: userData?.last_name,
                    email: userData?.email,
                    isEmailVerified: true,
                    isProfileImageLocalStorage: false,
                    profileImage: userData?.picture?.data?.url || null,
                    basicToken: accessToken || null,
                    isTermsAndConditions: true,
                    isLoggedIn: true,
                    status: 'APPROVED',
                });
            }

            res.redirect(`${ApiEndpoint.WEB_APP.SOCIAL_LOGIN_MEMBER_URL}${accessToken}`);
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }
    // } facebook auth login

    // social login callback {
    static async loginCallback(req: any, res: any): Promise<void> {
        try {
            // get config {
            const userStatusMaster = (await Core.Master.getUserStatus()) || {};
            const userStatusData = userStatusMaster?.dataOnKey || {};
            // } get config

            // sanitize data {
            const sanitizeResult = await sanitize(req?.body, {
                token: `required`,
            });
            if (sanitizeResult?.error || !sanitizeResult.body) throw new Error(sanitizeResult?.error);
            const body = sanitizeResult.body;
            // } sanitize data

            let data = {};
            const user: any = await User.findOne({ basicToken: body?.token, deletedAt: null }).lean();
            if (empty(user)) throw new Error(ADMIN_MSG.USER.ACCOUNT.NOT_FOUND);

            // get user data {
            const record: any = await User.findById(user?._id).populate([
                { path: 'createdBy', model: 'users' },
                { path: 'rolePermissionId', model: 'rolePermissions' }
            ]).lean();
            if (empty(record)) throw new Error(ADMIN_MSG.USER.ACCOUNT.NOT_FOUND);
            // } get user data

            // generate access token {
            const accessToken = Token.Jwt.sign({ _id: user._id });
            // } generate access token

            data = Format.merchantLoginDetails(record, { accessToken, userStatusData });

            return res.status(200).send({ status: true, message: INTERNAL_MSG.AUTH.LOGIN.SUCCESS, data });
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }
    // } social login callback

}