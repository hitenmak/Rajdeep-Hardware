// Models
import { Dealer } from '../../../models/dealer';

// Helpers
import { empty, getStr } from '../../../utils';
import MediaManager from '../../../services/media';
import { dealerDetails } from '../auth/helper/format';
import { lifetimeStats } from '../common/stats';

// Others
import { DEALER_MSG } from '../../../common/messages';
import { ApiError, HTTP_STATUS, sendApiError } from '../../../common/errors';

// Interfaces
import { IObj } from '../../../common/interfaces';

//--------------------------------------------------------------

const PROFILE_IMAGE_FIELD = 'profileImage';

const profileImageUrl = (dealer: IObj): string | null => {
    if (empty(dealer?.profileImage)) return null;
    return MediaManager.Profile.get(dealer.profileImage, dealer.isProfileImageLocalStorage !== false);
}

const removeStoredImage = async (dealer: IObj): Promise<void> => {
    if (empty(dealer?.profileImage)) return;
    await MediaManager.Profile.remove(dealer.profileImage).catch(() => null);
}

export default class Profile {

    static async details(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            const stats = await lifetimeStats(authDealer._id);
            const data = {
                ...dealerDetails(authDealer),
                profileImageUrl: profileImageUrl(authDealer),
                activeSince: authDealer.createdAt || null,
                stats,
            };
            return res.status(200).send({ status: true, message: DEALER_MSG.PROFILE.FOUND, data });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-PROFILE-DETAILS] -');
        }
    }

    // multipart/form-data, field "profileImage"
    static async setImage(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            const uploaded: any = await MediaManager.Profile.set({ [PROFILE_IMAGE_FIELD]: '' }, req, res);
            // a rejected upload must not fall through and wipe the current photo
            if (uploaded?.error) throw new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, getStr(uploaded.error));
            const fileName = getStr(uploaded?.[PROFILE_IMAGE_FIELD]);
            if (empty(fileName)) throw new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, DEALER_MSG.PROFILE.IMAGE_REQUIRED);

            const updated: any = await Dealer.findByIdAndUpdate(authDealer._id, { profileImage: fileName, isProfileImageLocalStorage: true }, { new: true }).lean();
            await removeStoredImage(authDealer);

            return res.status(200).send({ status: true, message: DEALER_MSG.PROFILE.IMAGE_UPDATED, data: { profileImageUrl: profileImageUrl(updated) } });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-PROFILE-IMAGE-SET] -');
        }
    }

    static async removeImage(req: any, res: any): Promise<void> {
        const { authDealer } = req;

        try {
            await Dealer.updateOne({ _id: authDealer._id }, { profileImage: null });
            await removeStoredImage(authDealer);

            return res.status(200).send({ status: true, message: DEALER_MSG.PROFILE.IMAGE_REMOVED, data: { profileImageUrl: null } });
        } catch (e: any) {
            return sendApiError(res, e, '[DEALER-PROFILE-IMAGE-REMOVE] -');
        }
    }

}
