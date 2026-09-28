import path from 'path';

// Models
import { Setting } from '../../models/setting';
import { RolePermission } from '../../models/role-permission';
import { CronJob } from '../../models/cron-job';
import { User } from '../../models/user';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getStr, findRecords } from '../../utils';
import FolderConfig from '../../services/media/config/FolderConfig';

// Others
import Config from '../../config';
import { INTERNAL_MSG } from '../../common/messages';
import ApiEndpoint from '../../config/ApiEndpoint';
import AdminMail from '../../services/mail/Admin';
import UserMail from '../../services/mail/User';
import { ROOT_DIR } from '../../config/Constant';

//--------------------------------------------------------------

export default async (): Promise<void> => {
    const ERROR_KEY = `CRON-MAIL-SEND`;

    try {
        logInfo(`${ERROR_KEY} start`);

        // get setting {
        const settingData = await Setting.findOne().lean();
        if (empty(settingData)) logInfo(INTERNAL_MSG.SETTING.DETAILS.NOT_FOUND);
        // } get setting

        // get admin role permission {
        const adminRolePermission = await RolePermission.findOne({ 'permission.isMaster': true }).lean();
        const masterAdmin = await User.findOne({ rolePermissionId: adminRolePermission?._id, status: 'APPROVED', deletedAt: null }).lean();
        // } get admin role permission

        // get cron data {
        let cronJobData = await findRecords(CronJob, { isSended: false }, {
            populate: [
                { path: 'userId', model: 'users' },
            ]
        });
        // } get cron data

        let cronJobIds: any = [];
        for (const cronJob of cronJobData) {
            if (cronJob?.cronType === 'MAIL') { // mail send
                let mailRes: any = {};
                if (cronJob?.isAdminMail) { // admin mail send
                    const toEmail = settingData.contactDetails.email;
                    if (cronJob?.type === 'ADMIN-MAIL-USER-SIGN-UP') {
                        // attachments {
                        const outputDir = path.resolve(ROOT_DIR, `../${Config.STORAGE.LOCAL_FOLDER}`);
                        let cacReportPath = cronJob?.userId?.cacReport ? path.join(outputDir, FolderConfig.USER_DOCUMENT.FOLDER, cronJob?.userId?.cacReport) : '';

                        let attachments = [];
                        if (!empty(cacReportPath)) attachments.push({ filename: cronJob?.userId?.cacReport || '', path: cacReportPath || '', contentType: 'application/x-custom-type' });
                        // } attachments

                        mailRes = await AdminMail.userSignUp({
                            toEmail,
                            settingData,
                            data: cronJob,
                            attachments
                        });
                        if (mailRes?.error) cronJobIds.push(getStr(cronJob?._id));
                    }
                } else { // user mail send
                    const toEmail = cronJob?.userId?.email;

                    if (cronJob?.type === 'USER-MAIL-SIGN-UP-THANK-YOU') { // user sign up thank you
                        mailRes = await UserMail.signUpThankYou({
                            toEmail,
                            loginMailUrl: `${ApiEndpoint.WEB_APP.LOGIN_MAIL_URL}`,
                            data: cronJob
                        });
                        if (mailRes?.error) cronJobIds.push(getStr(cronJob?._id));
                    }

                    if (cronJob?.type === 'USER-MAIL-PASSWORD-SET') { // new password set
                        const passwordSetUrl = `${ApiEndpoint.WEB_APP.PASSWORD_SET_URL}${cronJob?.userId?.password?.token}`;
                        mailRes = await UserMail.passwordSet({
                            toEmail,
                            passwordSetUrl,
                            data: cronJob
                        });
                        if (mailRes?.error) cronJobIds.push(getStr(cronJob?._id));
                    }

                    if (cronJob?.type === 'USER-MAIL-STATUS-CHANGED') { // user status change
                        mailRes = await UserMail.statusChanged({
                            toEmail,
                            data: cronJob
                        });
                        if (mailRes?.error) cronJobIds.push(getStr(cronJob?._id));
                    }
                }

                if (mailRes?.error) {
                    logInfo(mailRes?.error);
                    continue;
                }
            }
        }

        if (!empty(cronJobIds?.length) && cronJobIds?.length > 0) await CronJob.deleteMany({ _id: { $in: cronJobIds } });

        logInfo(`${ERROR_KEY} end`);
    } catch (e: any) {
        logError(e)
    }
}